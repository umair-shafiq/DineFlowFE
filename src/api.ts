import { MenuItem, Category } from './types';

export interface SpringBootSettings {
  enabled: boolean;
  baseUrl: string;
  categoriesPath: string;
  menuItemsPath: string;
}

const SETTINGS_KEY = 'spring_boot_connector_settings';

const DEFAULT_SETTINGS: SpringBootSettings = {
  enabled: false,
  baseUrl: 'http://localhost:8080',
  categoriesPath: '/api/categories',
  menuItemsPath: '/api/menuitems'
};

// Load settings from localStorage
export function getApiSettings(): SpringBootSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error reading Spring Boot settings', e);
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
export function saveApiSettings(settings: SpringBootSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving Spring Boot settings', e);
  }
}

// Test connection to Spring Boot with direct feedback
export async function testConnection(baseUrl: string, categoriesPath: string): Promise<{ success: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000); // 4 sec timeout

    // Sanitize path (ensure slash prefix)
    const sanitizedPath = categoriesPath.startsWith('/') ? categoriesPath : `/${categoriesPath}`;
    const url = `${baseUrl.replace(/\/$/, '')}${sanitizedPath}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
      mode: 'cors'
    });

    clearTimeout(id);
    if (response.ok) {
      return {
        success: true,
        message: `Successfully connected! Server responded with HTTP ${response.status} from endpoint "${sanitizedPath}".`
      };
    } else {
      return {
        success: false,
        message: `Reached server, but received HTTP error ${response.status} (${response.statusText}) from endpoint "${sanitizedPath}". Please check if the controller endpoint is implemented.`
      };
    }
  } catch (e: any) {
    console.warn('Primary check failed, running CORS & Port status scan', e);
    
    // Scan if host is reachable
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      await fetch(baseUrl, { method: 'GET', signal: controller.signal, mode: 'no-cors' });
      clearTimeout(id);
      return {
        success: false,
        message: `Network error: Reached Spring Boot port, but request was blocked. This is almost certainly a CORS issue! Please add the @CrossOrigin annotation to your Spring Boot Controller.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Could not reach Spring Boot server at "${baseUrl}". Please make sure your Spring Boot application is running and accessible from your browser.`
      };
    }
  }
}

// Standard api fetch utility
async function apiRequest<T>(endpointPath: string, method: string = 'GET', body?: any): Promise<T> {
  const settings = getApiSettings();
  if (!settings.enabled) {
    throw new Error('Spring Boot Live Integration is currently disabled.');
  }

  const baseUrlSanitized = settings.baseUrl.replace(/\/$/, '');
  const pathSanitized = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const url = `${baseUrlSanitized}${pathSanitized}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const options: RequestInit = {
    method,
    headers,
    mode: 'cors'
  };

  if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
    // Exclude react-specific local temp IDs if backend generates numerical IDs or UUIDs
    const preparedBody = { ...body };
    if (preparedBody.id && (
      String(preparedBody.id).startsWith('item-') || 
      String(preparedBody.id).startsWith('cat-') || 
      String(preparedBody.id).startsWith('item-temp-') || 
      String(preparedBody.id).startsWith('cat-temp-')
    )) {
      delete preparedBody.id;
    }
    options.body = JSON.stringify(preparedBody);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const err = new Error(`API Error: Spring Boot returned status ${response.status} (${response.statusText})`) as any;
    err.status = response.status;
    throw err;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// Categories REST Methods
export const apiCategories = {
  list: async (): Promise<Category[]> => {
    const settings = getApiSettings();
    const list = await apiRequest<any[]>(settings.categoriesPath, 'GET');
    return list.map(cat => ({
      ...cat,
      id: String(cat.id)
    }));
  },
  
  get: async (id: string): Promise<Category> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(`${settings.categoriesPath}/${id}`, 'GET');
    return {
      ...res,
      id: String(res.id)
    };
  },
  
  create: async (category: Omit<Category, 'id'> & { id?: string }): Promise<Category> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(settings.categoriesPath, 'POST', category);
    return {
      ...res,
      id: String(res.id)
    };
  },
  
  update: async (id: string, category: Category): Promise<Category> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(`${settings.categoriesPath}/${id}`, 'PUT', category);
    return {
      ...res,
      id: String(res.id)
    };
  },
  
  delete: async (id: string): Promise<void> => {
    const settings = getApiSettings();
    return apiRequest<void>(`${settings.categoriesPath}/${id}`, 'DELETE');
  }
};

// Menu Items REST Methods
export const apiMenuItems = {
  list: async (): Promise<MenuItem[]> => {
    const settings = getApiSettings();
    const list = await apiRequest<any[]>(settings.menuItemsPath, 'GET');
    return list.map(item => ({
      ...item,
      id: String(item.id)
    }));
  },
  
  get: async (id: string): Promise<MenuItem> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(`${settings.menuItemsPath}/${id}`, 'GET');
    return {
      ...res,
      id: String(res.id)
    };
  },
  
  create: async (item: Omit<MenuItem, 'id'> & { id?: string }): Promise<MenuItem> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(settings.menuItemsPath, 'POST', item);
    return {
      ...res,
      id: String(res.id)
    };
  },
  
  update: async (id: string, item: MenuItem): Promise<MenuItem> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(`${settings.menuItemsPath}/${id}`, 'PUT', item);
    return {
      ...res,
      id: String(res.id)
    };
  },
  
  delete: async (id: string): Promise<void> => {
    const settings = getApiSettings();
    return apiRequest<void>(`${settings.menuItemsPath}/${id}`, 'DELETE');
  }
};
