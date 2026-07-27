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
  menuItemsPath: '/api/menu-items'
};

// Load settings from localStorage
export function getApiSettings(): SpringBootSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.menuItemsPath === '/api/menuitems') {
        parsed.menuItemsPath = '/api/menu-items';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
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

// Normalization helpers
function normalizeCategory(raw: any): Category {
  if (!raw) return raw;
  return {
    id: String(raw.id !== undefined && raw.id !== null ? raw.id : ''),
    name: typeof raw === 'string' ? raw : (raw.name || String(raw.id || ''))
  };
}

function normalizeMenuItem(raw: any): MenuItem {
  if (!raw) return raw;
  
  // Extract category string safely whether Spring Boot sent an object { id: 5, name: "Cold Drinks" } or a plain string
  let categoryName = 'Uncategorized';
  let categoryId: number | string | undefined = undefined;
  if (raw.category && typeof raw.category === 'object') {
    categoryName = raw.category.name || 'Uncategorized';
    categoryId = raw.category.id;
  } else if (typeof raw.category === 'string') {
    categoryName = raw.category;
  } else if (raw.categoryName) {
    categoryName = raw.categoryName;
  }
  if (raw.categoryId !== undefined && categoryId === undefined) {
    categoryId = raw.categoryId;
  }

  // Handle image vs imageUrl
  const image = raw.imageUrl || raw.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

  const availabilityStatus =
  raw.availabilityStatus ||
  raw.status ||
  raw.availability ||
  (raw.outOfStock ? 'OUT_OF_STOCK' : 'AVAILABLE');

const outOfStock = availabilityStatus === 'OUT_OF_STOCK';

  return {
    id: String(raw.id !== undefined && raw.id !== null ? raw.id : ''),
    name: raw.name || '',
    price: Number(raw.price || 0),
    category: categoryName,
    categoryId: categoryId,
    availabilityStatus,
    outOfStock,
    image: image,
    imageUrl: image,
    description: raw.description || '',
    modifiers: raw.modifiers || []
  };
}

// Helper to resolve category ID from string name or object for POST / PUT payloads
async function resolveCategoryId(item: MenuItem | any): Promise<number | string> {
  // 1. If item already has a numeric categoryId or category object ID, use it
  if (item.categoryId !== undefined && item.categoryId !== null && item.categoryId !== '') {
    return !isNaN(Number(item.categoryId)) ? Number(item.categoryId) : item.categoryId;
  }
  if (item.category && typeof item.category === 'object' && item.category.id !== undefined) {
    return !isNaN(Number(item.category.id)) ? Number(item.category.id) : item.category.id;
  }

  const categoryName = typeof item.category === 'object' ? (item.category.name || '') : (item.category || '');
  if (!categoryName) return 1;

  try {
    // 2. Look up from localStorage cache first
    const localCats = JSON.parse(localStorage.getItem('chef_categories') || '[]');
    let match = localCats.find((c: any) => String(c.name).trim().toLowerCase() === String(categoryName).trim().toLowerCase());
    if (match && match.id !== undefined) {
      return !isNaN(Number(match.id)) ? Number(match.id) : match.id;
    }
    // 3. If not found locally, fetch live list from categories API
    const liveCats = await apiCategories.list();
    match = liveCats.find((c: any) => String(c.name).trim().toLowerCase() === String(categoryName).trim().toLowerCase());
    if (match && match.id !== undefined) {
      return !isNaN(Number(match.id)) ? Number(match.id) : match.id;
    }
  } catch (e) {
    console.warn('Error resolving categoryId:', e);
  }
  return 1; // fallback ID if category cannot be resolved
}

// Categories REST Methods
export const apiCategories = {
  list: async (): Promise<Category[]> => {
    const settings = getApiSettings();
    const list = await apiRequest<any[]>(settings.categoriesPath, 'GET');
    return Array.isArray(list) ? list.map(normalizeCategory) : [];
  },
  
  get: async (id: string): Promise<Category> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(`${settings.categoriesPath}/${id}`, 'GET');
    return normalizeCategory(res);
  },
  
  create: async (category: Omit<Category, 'id'> & { id?: string }): Promise<Category> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(settings.categoriesPath, 'POST', category);
    return normalizeCategory(res);
  },
  
  update: async (id: string, category: Category): Promise<Category> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(`${settings.categoriesPath}/${id}`, 'PUT', category);
    return normalizeCategory(res);
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
    return Array.isArray(list) ? list.map(normalizeMenuItem) : [];
  },
  
  get: async (id: string): Promise<MenuItem> => {
    const settings = getApiSettings();
    const res = await apiRequest<any>(`${settings.menuItemsPath}/${id}`, 'GET');
    return normalizeMenuItem(res);
  },
  
  create: async (item: Omit<MenuItem, 'id'> & { id?: string }): Promise<MenuItem> => {
    const settings = getApiSettings();
    const catId = await resolveCategoryId(item);
    const payload = {
      name: item.name,
      description: item.description || '',
      price: Number(item.price || 0),
      imageUrl: item.imageUrl || item.image || '',
      categoryId: catId
    };
    const res = await apiRequest<any>(settings.menuItemsPath, 'POST', payload);
    return normalizeMenuItem(res);
  },
  
  update: async (id: string, item: MenuItem): Promise<MenuItem> => {
    const settings = getApiSettings();
    const catId = await resolveCategoryId(item);
    const payload = {
      name: item.name,
      description: item.description || '',
      price: Number(item.price || 0),
      imageUrl: item.imageUrl || item.image || '',
      categoryId: catId
    };
    // 1. Execute PUT update for core item fields
    const res = await apiRequest<any>(`${settings.menuItemsPath}/${id}`, 'PUT', payload);
    let normalized = normalizeMenuItem(res);

    // 2. Execute PATCH availability endpoint as requested by user specification
    try {
      const statusParam = item.availabilityStatus ?? (item.outOfStock ? 'OUT_OF_STOCK' : 'AVAILABLE');
      const availRes = await apiRequest<any>(`${settings.menuItemsPath}/${id}/availability?status=${statusParam}`, 'PATCH');
      if (availRes && typeof availRes === 'object') {
        normalized = normalizeMenuItem(availRes);
      } else {
        normalized.outOfStock = item.outOfStock;
      }
    } catch (patchErr: any) {
      console.warn(`Note: Availability PATCH check for item ${id}: ${patchErr.message}`);
      normalized.outOfStock = item.outOfStock;
    }

    return normalized;
  },

  updateAvailability: async (id: string, outOfStock: boolean): Promise<MenuItem> => {
    const settings = getApiSettings();
    const statusParam = outOfStock ? 'OUT_OF_STOCK' : 'AVAILABLE';
    const res = await apiRequest<any>(`${settings.menuItemsPath}/${id}/availability?status=${statusParam}`, 'PATCH');
    return normalizeMenuItem(res);
  },
  
  delete: async (id: string): Promise<void> => {
    const settings = getApiSettings();
    return apiRequest<void>(`${settings.menuItemsPath}/${id}`, 'DELETE');
  }
};
