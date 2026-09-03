import { MenuItem, Category, Order, OrderItem, User, UserRole, AuthUser, RestaurantTable, TableStatus, Reservation, ReservationStatus, ReservationRequestDto } from './types';

export interface SpringBootSettings {
  enabled: boolean;
  baseUrl: string;
  categoriesPath: string;
  menuItemsPath: string;
  ordersPath: string;
  usersPath?: string;
  authPath?: string;
  tablesPath?: string;
  reservationsPath?: string;
}

const SETTINGS_KEY = 'spring_boot_connector_settings';

const DEFAULT_SETTINGS: SpringBootSettings = {
  enabled: true,
  baseUrl: 'http://localhost:8080',
  categoriesPath: '/api/categories',
  menuItemsPath: '/api/menu-items',
  ordersPath: '/api/orders',
  usersPath: '/api/users',
  authPath: '/api/auth',
  tablesPath: '/api/tables',
  reservationsPath: '/api/reservations'
};

// JWT token storage with localStorage persistence across page reloads
const JWT_STORAGE_KEY = 'dineflow_jwt_token';
let inMemoryJwtToken: string | null = null;
let onUnauthorizedCallback: ((message?: string) => void) | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryJwtToken = token;
  try {
    if (token) {
      localStorage.setItem(JWT_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(JWT_STORAGE_KEY);
    }
  } catch {
    // ignore storage quota/security errors
  }
}

export function getAuthToken(): string | null {
  if (inMemoryJwtToken) return inMemoryJwtToken;
  try {
    const stored = localStorage.getItem(JWT_STORAGE_KEY);
    if (stored) {
      inMemoryJwtToken = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
}

export function setOnUnauthorized(callback: ((message?: string) => void) | null): void {
  onUnauthorizedCallback = callback;
}

export const setOnUnauthorizedCallback = setOnUnauthorized;

// Load settings from localStorage
export function getApiSettings(): SpringBootSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.menuItemsPath === '/api/menuitems') {
        parsed.menuItemsPath = '/api/menu-items';
      }
      if (!parsed.ordersPath) {
        parsed.ordersPath = '/api/orders';
      }
      if (!parsed.usersPath) {
        parsed.usersPath = '/api/users';
      }
      if (!parsed.authPath) {
        parsed.authPath = '/api/auth';
      }
      if (!parsed.tablesPath) {
        parsed.tablesPath = '/api/tables';
      }
      if (!parsed.reservationsPath) {
        parsed.reservationsPath = '/api/reservations';
      }
      if (parsed.enabled === undefined) {
        parsed.enabled = true;
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

    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (inMemoryJwtToken) {
      headers['Authorization'] = `Bearer ${inMemoryJwtToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
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

// Standard api fetch utility with Authorization & 401/403 interceptor
async function apiRequest<T>(endpointPath: string, method: string = 'GET', body?: any): Promise<T> {
  const settings = getApiSettings();
  if (!settings.enabled) {
    throw new Error('Spring Boot Live Integration is currently disabled.');
  }

  const baseUrlSanitized = settings.baseUrl.replace(/\/$/, '');
  const pathSanitized = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const url = `${baseUrlSanitized}${pathSanitized}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Inject in-memory JWT token into Authorization header for all API calls
  if (inMemoryJwtToken) {
    headers['Authorization'] = `Bearer ${inMemoryJwtToken}`;
  }

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

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (networkErr: any) {
    const err = new Error(`Network Error: Could not reach Spring Boot server at ${url}.`) as any;
    err.isNetworkError = true;
    throw err;
  }

  // Handle 401 Unauthorized (invalid or expired session)
  if (response.status === 401) {
    inMemoryJwtToken = null;
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback('Invalid email or password');
    }
    const err = new Error('Invalid email or password') as any;
    err.status = 401;
    throw err;
  }

  // Handle 403 Forbidden (insufficient permission for this endpoint, keep user logged in)
  if (response.status === 403) {
    const err = new Error('Access denied: You do not have permission to access this endpoint.') as any;
    err.status = 403;
    throw err;
  }

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.message) errorDetail = errJson.message;
      else if (errJson.error) errorDetail = errJson.error;
    } catch {
      // ignore
    }
    const err = new Error(`API Error: Spring Boot returned status ${response.status} (${errorDetail})`) as any;
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
  const categoryName = typeof item.category === 'object' ? (item.category.name || '') : (item.category || '');

  // 1. Prioritize category name lookup in local cache or live categories so updated categories get new IDs
  if (categoryName) {
    try {
      const localCats = JSON.parse(localStorage.getItem('chef_categories') || '[]');
      let match = localCats.find((c: any) => String(c.name).trim().toLowerCase() === String(categoryName).trim().toLowerCase());
      if (match && match.id !== undefined && match.id !== '') {
        return !isNaN(Number(match.id)) ? Number(match.id) : match.id;
      }
      const liveCats = await apiCategories.list();
      match = liveCats.find((c: any) => String(c.name).trim().toLowerCase() === String(categoryName).trim().toLowerCase());
      if (match && match.id !== undefined && match.id !== '') {
        return !isNaN(Number(match.id)) ? Number(match.id) : match.id;
      }
    } catch (e) {
      console.warn('Error resolving categoryId by name:', e);
    }
  }

  // 2. Fall back to existing categoryId if set
  if (item.categoryId !== undefined && item.categoryId !== null && item.categoryId !== '') {
    return !isNaN(Number(item.categoryId)) ? Number(item.categoryId) : item.categoryId;
  }
  if (item.category && typeof item.category === 'object' && item.category.id !== undefined) {
    return !isNaN(Number(item.category.id)) ? Number(item.category.id) : item.category.id;
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
        normalized.availabilityStatus = statusParam;
      }
    } catch (patchErr: any) {
      console.warn(`Note: Availability PATCH check for item ${id}: ${patchErr.message}`);
      normalized.outOfStock = item.outOfStock;
      normalized.availabilityStatus = item.outOfStock ? 'OUT_OF_STOCK' : 'AVAILABLE';
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

// Order Normalization Helper
function normalizeOrder(raw: any): Order {
  if (!raw) return raw;

  const rawStatus = String(raw.orderStatus || raw.status || 'PLACED').toUpperCase();
  let appStatus: 'pending' | 'preparing' | 'completed' | 'cancelled' = 'pending';
  if (rawStatus === 'IN_PROGRESS' || rawStatus === 'PREPARING') {
    appStatus = 'preparing';
  } else if (rawStatus === 'COMPLETED' || rawStatus === 'SERVED' || rawStatus === 'READY') {
    appStatus = 'completed';
  } else if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELED') {
    appStatus = 'cancelled';
  } else {
    appStatus = 'pending';
  }

  const rawOrderType = raw.orderType ? String(raw.orderType).toUpperCase() : (raw.restaurantTable || raw.restaurantTableId ? 'DINE_IN' : 'TAKEAWAY');
  const orderTypeVal: 'DINE_IN' | 'TAKEAWAY' = rawOrderType === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE_IN';

  const rawTable = raw.restaurantTable;
  let tableNumStr = 'Takeaway';
  if (orderTypeVal === 'DINE_IN') {
    tableNumStr = rawTable?.tableNumber 
      ? (String(rawTable.tableNumber).toLowerCase().startsWith('t') || String(rawTable.tableNumber).toLowerCase().startsWith('table') ? String(rawTable.tableNumber) : `Table ${rawTable.tableNumber}`)
      : (raw.tableNumber || `Table 0${raw.restaurantTableId || rawTable?.restaurantTableId || 1}`);
  } else if (raw.tableNumber && raw.tableNumber !== 'Takeaway') {
    tableNumStr = raw.tableNumber;
  }

  const rawOrderItems = raw.orderItems || raw.items || [];
  const items: OrderItem[] = Array.isArray(rawOrderItems) 
    ? rawOrderItems.map((oi: any, idx: number) => {
        const mi = oi.menuItem || {};
        const itemId = String(mi.id || oi.menuItemId || idx);
        const orderItemId = String(oi.orderItemId || oi.id || `${itemId}-${idx}`);
        const unitPrice = Number(oi.unitPrice !== undefined ? oi.unitPrice : (oi.price !== undefined ? oi.price : (mi.price || 0)));
        const qty = Number(oi.quantity || 1);
        return {
          id: orderItemId,
          menuItemId: itemId,
          name: mi.name || oi.name || 'Menu Item',
          quantity: qty,
          price: unitPrice,
          subtotal: Number(oi.subtotal || (unitPrice * qty)),
          unitPrice: unitPrice,
          selectedModifiers: oi.selectedModifiers || []
        };
      })
    : [];

  const idVal = String(raw.orderId !== undefined && raw.orderId !== null ? raw.orderId : (raw.id !== undefined && raw.id !== null ? raw.id : ''));
  const orderNum = raw.orderNumber || (idVal ? `ORD-${idVal}` : `ORD-${Date.now()}`);

  return {
    id: idVal || `order-${Date.now()}`,
    orderId: raw.orderId || raw.id,
    orderNumber: orderNum,
    items,
    total: Number(raw.totalAmount !== undefined ? raw.totalAmount : (raw.subtotal !== undefined ? raw.subtotal : raw.total || 0)),
    subtotal: Number(raw.subtotal !== undefined ? raw.subtotal : 0),
    taxAmount: Number(raw.taxAmount !== undefined ? raw.taxAmount : 0),
    totalAmount: Number(raw.totalAmount !== undefined ? raw.totalAmount : 0),
    status: appStatus,
    orderStatus: raw.orderStatus || rawStatus,
    orderType: orderTypeVal,
    createdAt: raw.createdAt || new Date().toISOString(),
    tableNumber: tableNumStr,
    restaurantTableId: rawTable?.restaurantTableId || raw.restaurantTableId || undefined,
    restaurantTable: rawTable,
    customerName: raw.customerName || (orderTypeVal === 'TAKEAWAY' ? 'Takeaway Customer' : (rawTable?.tableNumber ? `Table ${rawTable.tableNumber}` : 'Guest Customer'))
  };
}

// Orders REST Methods
export const apiOrders = {
  list: async (): Promise<Order[]> => {
    const settings = getApiSettings();
    const path = settings.ordersPath || '/api/orders';
    const list = await apiRequest<any[]>(path, 'GET');
    return Array.isArray(list) ? list.map(normalizeOrder) : [];
  },

  listActive: async (): Promise<Order[]> => {
    const settings = getApiSettings();
    const basePath = (settings.ordersPath || '/api/orders').replace(/\/$/, '');
    const list = await apiRequest<any[]>(`${basePath}/active`, 'GET');
    return Array.isArray(list) ? list.map(normalizeOrder) : [];
  },

  get: async (idOrTicket: string): Promise<Order> => {
    const settings = getApiSettings();
    const basePath = (settings.ordersPath || '/api/orders').replace(/\/$/, '');
    const clean = encodeURIComponent(String(idOrTicket).trim());
    const res = await apiRequest<any>(`${basePath}/${clean}`, 'GET');
    return normalizeOrder(res);
  },

  create: async (orderPayload: { orderType?: 'DINE_IN' | 'TAKEAWAY'; restaurantTableId?: number; tableNumber?: string; items?: OrderItem[]; menuItems?: any[] } | any): Promise<Order> => {
    const settings = getApiSettings();
    const path = settings.ordersPath || '/api/orders';

    const orderType = (orderPayload.orderType || (orderPayload.restaurantTableId ? 'DINE_IN' : 'TAKEAWAY')).toUpperCase();

    const itemsSource = orderPayload.menuItems || orderPayload.items || [];
    const payloadMenuItems = itemsSource.map((item: any) => ({
      menuItemId: !isNaN(Number(item.menuItemId)) 
        ? Number(item.menuItemId) 
        : (!isNaN(Number(item.id)) ? Number(item.id) : item.menuItemId || item.id),
      quantity: Number(item.quantity || 1)
    }));

    const body: any = {
      menuItems: payloadMenuItems,
      orderType: orderType
    };

    if (orderType === 'DINE_IN') {
      let tableId = 1;
      if (orderPayload.restaurantTableId) {
        tableId = Number(orderPayload.restaurantTableId);
      } else if (orderPayload.tableNumber) {
        const match = String(orderPayload.tableNumber).match(/\d+/);
        if (match) {
          tableId = parseInt(match[0], 10);
        }
      }
      body.restaurantTableId = tableId;
    }

    const res = await apiRequest<any>(path, 'POST', body);
    return normalizeOrder(res);
  },

  updateStatus: async (id: string, newStatus: string): Promise<Order> => {
    const settings = getApiSettings();
    const basePath = (settings.ordersPath || '/api/orders').replace(/\/$/, '');

    let orderStatus = 'PLACED';
    const upper = String(newStatus).toUpperCase();
    if (upper === 'PREPARING' || upper === 'IN_PROGRESS') {
      orderStatus = 'IN_PROGRESS';
    } else if (upper === 'COMPLETED' || upper === 'SERVED') {
      orderStatus = 'COMPLETED';
    } else if (upper === 'CANCELLED' || upper === 'CANCELED') {
      orderStatus = 'CANCELLED';
    } else if (upper === 'PLACED' || upper === 'PENDING') {
      orderStatus = 'PLACED';
    } else {
      orderStatus = upper; // fallback to verbatim if custom string provided
    }

    const res = await apiRequest<any>(`${basePath}/${id}/status`, 'PATCH', { orderStatus });
    return normalizeOrder(res);
  }
};

// Normalizer for User
function normalizeUser(raw: any): User {
  if (!raw) return raw;
  const roleStr = String(raw.userRole || raw.role || 'WAITER').toUpperCase();
  const validRole: UserRole = roleStr === 'ADMIN' ? 'ADMIN' : 'WAITER';
  const rawStatus = raw.userStatus !== undefined ? raw.userStatus : (raw.enabled !== undefined ? raw.enabled : (raw.status !== undefined ? raw.status : true));
  
  return {
    userId: Number(raw.userId || raw.id || 0),
    id: String(raw.userId || raw.id || ''),
    fullName: raw.fullName || raw.name || raw.email || 'User',
    email: raw.email || '',
    userRole: validRole,
    userStatus: typeof rawStatus === 'boolean' ? rawStatus : String(rawStatus).toLowerCase() === 'true' || rawStatus === 1,
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

// Authentication API
export const apiAuth = {
  login: async (credentials: { email: string; password: string }): Promise<AuthUser> => {
    const settings = getApiSettings();
    const basePath = (settings.authPath || '/api/auth').replace(/\/$/, '');
    const baseUrl = settings.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}${basePath}/login`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: credentials.email.trim(),
          password: credentials.password
        }),
        mode: 'cors'
      });
    } catch (networkErr: any) {
      const err = new Error(`Cannot connect to authentication server at ${url}. Please ensure Spring Boot is running on port 8080.`) as any;
      err.isNetworkError = true;
      throw err;
    }

    if (response.status === 401) {
      throw new Error('Invalid email or password');
    }

    if (!response.ok) {
      let message = 'Login failed';
      try {
        const data = await response.json();
        if (data.message) message = data.message;
        else if (data.error) message = data.error;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    const resJson = await response.json();
    const token = resJson.token || resJson.jwt || resJson.accessToken || '';
    const email = resJson.email || credentials.email;
    const roleStr = String(resJson.userRole || resJson.role || 'ADMIN').toUpperCase();
    const userRole: UserRole = roleStr === 'WAITER' ? 'WAITER' : 'ADMIN';

    // Store in-memory token
    if (token) {
      setAuthToken(token);
    }

    return {
      token,
      email,
      userRole,
      fullName: resJson.fullName || resJson.name || email.split('@')[0],
      userId: resJson.userId || resJson.id
    };
  }
};

// Users Management API (for ADMIN role)
export const apiUsers = {
  list: async (): Promise<User[]> => {
    const settings = getApiSettings();
    const path = settings.usersPath || '/api/users';
    const list = await apiRequest<any[]>(path, 'GET');
    return Array.isArray(list) ? list.map(normalizeUser) : [];
  },

  getById: async (id: number | string): Promise<User> => {
    const settings = getApiSettings();
    const basePath = (settings.usersPath || '/api/users').replace(/\/$/, '');
    const res = await apiRequest<any>(`${basePath}/${id}`, 'GET');
    return normalizeUser(res);
  },

  searchByEmail: async (email: string): Promise<User> => {
    const settings = getApiSettings();
    const basePath = (settings.usersPath || '/api/users').replace(/\/$/, '');
    const encoded = encodeURIComponent(email.trim());
    const res = await apiRequest<any>(`${basePath}/search?email=${encoded}`, 'GET');
    return normalizeUser(res);
  },

  create: async (payload: { fullName: string; email: string; password?: string; userRole: UserRole }): Promise<User> => {
    const settings = getApiSettings();
    const path = settings.usersPath || '/api/users';
    const body = {
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      password: payload.password || '',
      userRole: payload.userRole
    };
    const res = await apiRequest<any>(path, 'POST', body);
    return normalizeUser(res);
  },

  update: async (id: number | string, payload: { fullName: string; password?: string; userRole: UserRole }): Promise<User> => {
    const settings = getApiSettings();
    const basePath = (settings.usersPath || '/api/users').replace(/\/$/, '');
    const body: Record<string, any> = {
      fullName: payload.fullName.trim(),
      userRole: payload.userRole
    };
    if (payload.password && payload.password.trim().length > 0) {
      body.password = payload.password;
    }
    const res = await apiRequest<any>(`${basePath}/${id}`, 'PUT', body);
    return normalizeUser(res);
  },

  updateStatus: async (id: number | string, enabled: boolean): Promise<User> => {
    const settings = getApiSettings();
    const basePath = (settings.usersPath || '/api/users').replace(/\/$/, '');
    // Correct clean endpoint: /api/users/{id}/status?enabled=...
    const res = await apiRequest<any>(`${basePath}/${id}/status?enabled=${enabled}`, 'PATCH');
    return normalizeUser(res);
  }
};

// Normalizer for Restaurant Table
function normalizeTable(raw: any): RestaurantTable {
  if (!raw) return raw;
  const tableId = Number(raw.restaurantTableId || raw.id || 0);
  return {
    restaurantTableId: tableId,
    id: tableId,
    tableNumber: String(raw.tableNumber || (tableId ? `T-0${tableId}` : 'T-01')),
    capacity: Number(raw.capacity || 4),
    tableStatus: String(raw.tableStatus || raw.status || 'FREE').toUpperCase() as TableStatus
  };
}

// Restaurant Tables REST API
export const apiTables = {
  list: async (): Promise<RestaurantTable[]> => {
    const settings = getApiSettings();
    const path = settings.tablesPath || '/api/tables';
    const list = await apiRequest<any[]>(path, 'GET');
    return Array.isArray(list) ? list.map(normalizeTable) : [];
  },

  getById: async (id: number | string): Promise<RestaurantTable> => {
    const settings = getApiSettings();
    const basePath = (settings.tablesPath || '/api/tables').replace(/\/$/, '');
    const res = await apiRequest<any>(`${basePath}/${id}`, 'GET');
    return normalizeTable(res);
  },

  create: async (payload: { tableNumber: string; capacity: number; tableStatus?: TableStatus }): Promise<RestaurantTable> => {
    const settings = getApiSettings();
    const path = settings.tablesPath || '/api/tables';
    const body = {
      tableNumber: payload.tableNumber.trim(),
      capacity: Number(payload.capacity),
      tableStatus: payload.tableStatus || 'FREE'
    };
    const res = await apiRequest<any>(path, 'POST', body);
    return normalizeTable(res);
  },

  update: async (id: number | string, payload: { capacity: number; tableNumber?: string }): Promise<RestaurantTable> => {
    const settings = getApiSettings();
    const basePath = (settings.tablesPath || '/api/tables').replace(/\/$/, '');
    const body: Record<string, any> = {
      capacity: Number(payload.capacity)
    };
    if (payload.tableNumber && payload.tableNumber.trim().length > 0) {
      body.tableNumber = payload.tableNumber.trim();
    }
    const res = await apiRequest<any>(`${basePath}/${id}`, 'PUT', body);
    return normalizeTable(res);
  },

  delete: async (id: number | string): Promise<void> => {
    const settings = getApiSettings();
    const basePath = (settings.tablesPath || '/api/tables').replace(/\/$/, '');
    await apiRequest<any>(`${basePath}/${id}`, 'DELETE');
  }
};

// Normalizer for Reservation
function normalizeReservation(raw: any): Reservation {
  if (!raw) return raw;
  const resId = Number(raw.reservationId || raw.id || 0);
  const table = raw.restaurantTable ? normalizeTable(raw.restaurantTable) : undefined;
  const tableId = raw.restaurantTableId ? Number(raw.restaurantTableId) : (table?.restaurantTableId);
  return {
    reservationId: resId,
    id: resId,
    customerName: String(raw.customerName || ''),
    customerPhone: String(raw.customerPhone || ''),
    numberOfGuests: Number(raw.numberOfGuests || 1),
    reservationDateTime: String(raw.reservationDateTime || ''),
    restaurantTableId: tableId,
    restaurantTable: table,
    status: (String(raw.status || raw.reservationStatus || 'PENDING').toUpperCase()) as ReservationStatus,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined
  };
}

// Reservations REST API
export const apiReservations = {
  list: async (): Promise<Reservation[]> => {
    const settings = getApiSettings();
    const path = settings.reservationsPath || '/api/reservations';
    const list = await apiRequest<any[]>(path, 'GET');
    return Array.isArray(list) ? list.map(normalizeReservation) : [];
  },

  getById: async (id: number | string): Promise<Reservation> => {
    const settings = getApiSettings();
    const basePath = (settings.reservationsPath || '/api/reservations').replace(/\/$/, '');
    const res = await apiRequest<any>(`${basePath}/${id}`, 'GET');
    return normalizeReservation(res);
  },

  create: async (payload: ReservationRequestDto): Promise<Reservation> => {
    const settings = getApiSettings();
    const path = settings.reservationsPath || '/api/reservations';
    const body: Record<string, any> = {
      restaurantTableId: Number(payload.restaurantTableId),
      customerName: payload.customerName?.trim(),
      customerPhone: payload.customerPhone?.trim(),
      numberOfGuests: Number(payload.numberOfGuests),
      reservationDateTime: payload.reservationDateTime
    };
    const res = await apiRequest<any>(path, 'POST', body);
    return normalizeReservation(res);
  },

  update: async (id: number | string, payload: Partial<ReservationRequestDto>): Promise<Reservation> => {
    const settings = getApiSettings();
    const basePath = (settings.reservationsPath || '/api/reservations').replace(/\/$/, '');
    const body: Record<string, any> = {};
    if (payload.restaurantTableId !== undefined) {
      body.restaurantTableId = Number(payload.restaurantTableId);
    }
    if (payload.customerName !== undefined) {
      body.customerName = payload.customerName.trim();
    }
    if (payload.customerPhone !== undefined) {
      body.customerPhone = payload.customerPhone.trim();
    }
    if (payload.numberOfGuests !== undefined) {
      body.numberOfGuests = Number(payload.numberOfGuests);
    }
    if (payload.reservationDateTime !== undefined) {
      body.reservationDateTime = payload.reservationDateTime;
    }
    const res = await apiRequest<any>(`${basePath}/${id}`, 'PUT', body);
    return normalizeReservation(res);
  },

  updateStatus: async (id: number | string, status: ReservationStatus): Promise<Reservation> => {
    const settings = getApiSettings();
    const basePath = (settings.reservationsPath || '/api/reservations').replace(/\/$/, '');
    const res = await apiRequest<any>(`${basePath}/${id}/status?reservationStatus=${status}`, 'PATCH');
    return normalizeReservation(res);
  },

  delete: async (id: number | string): Promise<void> => {
    const settings = getApiSettings();
    const basePath = (settings.reservationsPath || '/api/reservations').replace(/\/$/, '');
    await apiRequest<any>(`${basePath}/${id}`, 'DELETE');
  }
};
