import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MenuItemsView from './components/MenuItemsView';
import CategoriesView from './components/CategoriesView';
import ModifiersView from './components/ModifiersView';
import OrdersView from './components/OrdersView';
import ReportsView from './components/ReportsView';
import SupportView from './components/SupportView';
import UsersView from './components/UsersView';
import LoginView from './components/LoginView';

import { MenuItem, Category, Modifier, Order, AuthUser, User } from './types';
import {
  INITIAL_MENU_ITEMS,
  INITIAL_CATEGORIES,
  INITIAL_MODIFIERS,
  INITIAL_ORDERS,
  INITIAL_USERS,
  loadData,
  saveData
} from './data';
import { 
  SpringBootSettings, 
  getApiSettings, 
  saveApiSettings, 
  apiCategories, 
  apiMenuItems, 
  apiOrders,
  apiUsers,
  setAuthToken,
  setOnUnauthorizedCallback
} from './api';

export default function App() {
  // In-Memory Authentication State (No localStorage or sessionStorage used for JWT/Auth per requirement)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Navigation & Search State
  const [currentTab, setCurrentTab] = useState<string>('orders');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Core Data States
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Spring Boot Integration States
  const [apiSettings, setApiSettings] = useState<SpringBootSettings>(getApiSettings());
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [apiStatusMessage, setApiStatusMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);

  // Menu items Add Modal global trigger
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Intercept 401/403 session expiration
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      console.warn('Session expired or unauthorized (401/403). Resetting memory auth state.');
      setCurrentUser(null);
      setAuthToken(null);
    });
  }, []);

  // Handle successful login and role-based redirect
  const handleLoginSuccess = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    const activeSettings: SpringBootSettings = {
      ...getApiSettings(),
      enabled: true
    };
    setApiSettings(activeSettings);
    saveApiSettings(activeSettings);

    if (user.userRole === 'ADMIN') {
      // "ADMIN" → redirect to dashboard
      setCurrentTab('reports');
    } else {
      // "WAITER" → redirect to orders
      setCurrentTab('orders');
    }

    // Immediately fetch live orders & data from Spring Boot using the authenticated token
    loadAllData(activeSettings);
  }, []);

  // Handle logout
  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentTab('orders');
  }, []);

  // Initialize and load persistent data or fetch from Spring Boot REST API
  const loadAllData = async (settingsToUse = apiSettings) => {
    setIsApiLoading(true);
    setApiStatusMessage(null);
    
    // Always load local modifiers
    setModifiers(loadData<Modifier[]>('chef_modifiers', INITIAL_MODIFIERS));

    if (settingsToUse.enabled) {
      let catSuccess = false;
      let itemsSuccess = false;
      let ordersSuccess = false;
      let loadedCatsCount = 0;
      let loadedItemsCount = 0;
      let loadedOrdersCount = 0;

      // 1. Fetch categories
      try {
        const fetchedCategories = await apiCategories.list();
        setCategories(fetchedCategories);
        loadedCatsCount = fetchedCategories.length;
        catSuccess = true;
      } catch (err: any) {
        console.warn('Failed to load categories from Spring Boot. Falling back to LocalStorage.', err);
        setCategories(loadData<Category[]>('chef_categories', INITIAL_CATEGORIES));
      }

      // 2. Fetch menu items
      try {
        const fetchedItems = await apiMenuItems.list();
        setItems(fetchedItems);
        loadedItemsCount = fetchedItems.length;
        itemsSuccess = true;
      } catch (err: any) {
        console.warn('Failed to load menu items from Spring Boot. Falling back to LocalStorage.', err);
        setItems(loadData<MenuItem[]>('chef_menu_items', INITIAL_MENU_ITEMS));
      }

      // 3. Fetch orders
      try {
        const fetchedOrders = await apiOrders.list();
        setOrders(fetchedOrders);
        loadedOrdersCount = fetchedOrders.length;
        ordersSuccess = true;
      } catch (err: any) {
        console.warn('Failed to load orders from Spring Boot. Falling back to LocalStorage.', err);
        setOrders(loadData<Order[]>('chef_orders', INITIAL_ORDERS));
      }

      // 4. Fetch users (if authenticated/accessible)
      try {
        const fetchedUsers = await apiUsers.list();
        if (Array.isArray(fetchedUsers) && fetchedUsers.length > 0) {
          setUsers(fetchedUsers);
        } else {
          setUsers(loadData<User[]>('chef_users', INITIAL_USERS));
        }
      } catch (err) {
        setUsers(loadData<User[]>('chef_users', INITIAL_USERS));
      }

      if (catSuccess && itemsSuccess && ordersSuccess) {
        setApiConnected(true);
        setApiStatusMessage({
          type: 'success',
          text: `Successfully connected to Spring Boot REST API! Loaded ${loadedCatsCount} categories, ${loadedItemsCount} menu items, and ${loadedOrdersCount} orders from the live database.`
        });
      } else if (catSuccess || itemsSuccess || ordersSuccess) {
        setApiConnected(true);
        setApiStatusMessage({
          type: 'warning',
          text: `Partially connected! ${catSuccess ? `${loadedCatsCount} categories loaded.` : ''} ${itemsSuccess ? `${loadedItemsCount} items loaded.` : ''} ${ordersSuccess ? `${loadedOrdersCount} orders loaded.` : ''}`
        });
      } else {
        setApiConnected(false);
        setApiStatusMessage({
          type: 'error',
          text: `Could not connect to Spring Boot server at "${settingsToUse.baseUrl}". Fell back to Local Storage backup.`
        });
      }
      setIsApiLoading(false);
    } else {
      // Offline mode - Load directly from LocalStorage
      setCategories(loadData<Category[]>('chef_categories', INITIAL_CATEGORIES));
      setItems(loadData<MenuItem[]>('chef_menu_items', INITIAL_MENU_ITEMS));
      setOrders(loadData<Order[]>('chef_orders', INITIAL_ORDERS));
      setUsers(loadData<User[]>('chef_users', INITIAL_USERS));
      setApiConnected(null);
      setIsApiLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Save changes to localStorage or sync with Spring Boot
  const handleItemsChange = async (updatedItems: MenuItem[]) => {
    if (apiSettings.enabled) {
      try {
        // Diff arrays to trigger corresponding REST operations automatically
        const added = updatedItems.filter(ui => !items.some(i => i.id === ui.id));
        const updated = updatedItems.filter(ui => {
          const matched = items.find(i => i.id === ui.id);
          return matched && (
            matched.name !== ui.name ||
            matched.price !== ui.price ||
            matched.category !== ui.category ||
            matched.outOfStock !== ui.outOfStock ||
            matched.image !== ui.image ||
            matched.description !== ui.description ||
            JSON.stringify(matched.modifiers) !== JSON.stringify(ui.modifiers)
          );
        });
        const deleted = items.filter(i => !updatedItems.some(ui => ui.id === i.id));

        // Sync added
        for (const item of added) {
          try {
            const res = await apiMenuItems.create(item);
            if (res && res.id) {
              item.id = String(res.id);
            }
          } catch (err: any) {
            // Check for 409 Conflict (item already exists in backend database)
            if (err.status === 409 || String(err.message).includes('409') || String(err.message).includes('Conflict')) {
              console.log(`Menu Item "${item.name}" already exists in Spring Boot DB. Resolving ID...`);
              try {
                const liveItems = await apiMenuItems.list();
                const matchedLive = liveItems.find(i => i.name.toLowerCase() === item.name.toLowerCase());
                if (matchedLive) {
                  item.id = String(matchedLive.id);
                  console.log(`Resolved ID "${item.id}" for Menu Item "${item.name}".`);
                } else {
                  throw err;
                }
              } catch (fetchErr) {
                throw err;
              }
            } else {
              throw err;
            }
          }
        }

        // Sync updated
        for (const item of updated) {
          await apiMenuItems.update(item.id, item);
        }

        // Sync deleted
        for (const item of deleted) {
          await apiMenuItems.delete(item.id);
        }

        setItems([...updatedItems]);
        saveData('chef_menu_items', updatedItems);
        setApiConnected(true);
      } catch (err: any) {
        console.error('Failed to sync items to Spring Boot', err);
        setApiConnected(false);
        setApiStatusMessage({
          type: 'error',
          text: `Sync Error: ${err.message}. Changes saved locally but failed to synchronize to Spring Boot.`
        });
        // Save locally anyway as failover
        setItems(updatedItems);
        saveData('chef_menu_items', updatedItems);
      }
    } else {
      setItems(updatedItems);
      saveData('chef_menu_items', updatedItems);
    }
  };

  const handleCategoriesChange = async (updatedCategories: Category[]) => {
    if (apiSettings.enabled) {
      try {
        // Diff arrays to trigger REST operations automatically
        const added = updatedCategories.filter(uc => !categories.some(c => c.id === uc.id));
        const updated = updatedCategories.filter(uc => {
          const matched = categories.find(c => c.id === uc.id);
          return matched && matched.name !== uc.name;
        });
        const deleted = categories.filter(c => !updatedCategories.some(uc => uc.id === c.id));

        // Sync creates
        for (const cat of added) {
          try {
            const res = await apiCategories.create({ name: cat.name });
            if (res && res.id) {
              cat.id = String(res.id);
            }
          } catch (err: any) {
            // Check for 409 Conflict (category already exists in backend database)
            if (err.status === 409 || String(err.message).includes('409') || String(err.message).includes('Conflict')) {
              console.log(`Category "${cat.name}" already exists in Spring Boot DB. Resolving ID...`);
              try {
                const liveCategories = await apiCategories.list();
                const matchedLive = liveCategories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
                if (matchedLive) {
                  cat.id = String(matchedLive.id);
                  console.log(`Resolved ID "${cat.id}" for category "${cat.name}".`);
                } else {
                  throw err;
                }
              } catch (fetchErr) {
                throw err;
              }
            } else {
              throw err;
            }
          }
        }

        // Sync updates
        for (const cat of updated) {
          await apiCategories.update(cat.id, cat);
        }

        // Sync deletes
        for (const cat of deleted) {
          await apiCategories.delete(cat.id);
        }

        setCategories([...updatedCategories]);
        saveData('chef_categories', updatedCategories);
        setApiConnected(true);
      } catch (err: any) {
        console.error('Failed to sync categories to Spring Boot', err);
        setApiConnected(false);
        setApiStatusMessage({
          type: 'error',
          text: `Sync Error: ${err.message}. Changes saved locally but failed to synchronize to Spring Boot.`
        });
        // Save locally anyway as failover
        setCategories(updatedCategories);
        saveData('chef_categories', updatedCategories);
      }
    } else {
      setCategories(updatedCategories);
      saveData('chef_categories', updatedCategories);
    }
  };

  const handleModifiersChange = (updatedModifiers: Modifier[]) => {
    setModifiers(updatedModifiers);
    saveData('chef_modifiers', updatedModifiers);

    // Synchronize: If a modifier is deleted, remove it from all linked menu items
    const activeModIds = updatedModifiers.map((m) => m.id);
    const cleanedItems = items.map((item) => {
      if (item.modifiers) {
        const filtered = item.modifiers.filter((modId) => activeModIds.includes(modId));
        return { ...item, modifiers: filtered };
      }
      return item;
    });
    handleItemsChange(cleanedItems);
  };

  const handleOrdersChange = async (updatedOrders: Order[]) => {
    if (apiSettings.enabled) {
      try {
        const isMatch = (a: Order, b: Order) => 
          String(a.id) === String(b.id) || 
          (a.orderId !== undefined && b.orderId !== undefined && String(a.orderId) === String(b.orderId)) ||
          (a.orderNumber && b.orderNumber && String(a.orderNumber).toLowerCase() === String(b.orderNumber).toLowerCase());

        const added = updatedOrders.filter(uo => !orders.some(o => isMatch(o, uo)));
        const statusChanged = updatedOrders.filter(uo => {
          const matched = orders.find(o => isMatch(o, uo));
          return matched && matched.status !== uo.status;
        });

        for (const newOrd of added) {
          try {
            const res = await apiOrders.create(newOrd);
            if (res && res.id) {
              newOrd.id = String(res.id);
              newOrd.orderId = res.orderId || res.id;
              newOrd.orderNumber = res.orderNumber || newOrd.orderNumber;
              newOrd.orderStatus = res.orderStatus || newOrd.orderStatus;
              newOrd.orderType = res.orderType || newOrd.orderType;
              newOrd.subtotal = res.subtotal;
              newOrd.taxAmount = res.taxAmount;
              newOrd.totalAmount = res.totalAmount;
              newOrd.restaurantTable = res.restaurantTable;
              if (res.tableNumber) newOrd.tableNumber = res.tableNumber;
            }
          } catch (createErr: any) {
            console.warn('Order creation API sync error:', createErr);
          }
        }

        for (const statusOrd of statusChanged) {
          try {
            const backendStatus = statusOrd.status === 'preparing' ? 'IN_PROGRESS' 
              : statusOrd.status === 'completed' ? 'COMPLETED' 
              : statusOrd.status === 'cancelled' ? 'CANCELLED' : 'PLACED';
            await apiOrders.updateStatus(statusOrd.id, backendStatus);
          } catch (statusErr: any) {
            console.warn('Order status PATCH sync error:', statusErr);
          }
        }

        // Merge updatedOrders into orders without dropping unreferenced historical items
        const merged = [...orders];
        for (const uo of updatedOrders) {
          const idx = merged.findIndex(o => isMatch(o, uo));
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...uo };
          } else {
            merged.unshift(uo);
          }
        }

        setOrders(merged);
        saveData('chef_orders', merged);
      } catch (err: any) {
        console.error('Failed to sync orders to Spring Boot', err);
        setOrders(updatedOrders);
        saveData('chef_orders', updatedOrders);
      }
    } else {
      setOrders(updatedOrders);
      saveData('chef_orders', updatedOrders);
    }
  };

  const handleUsersChange = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    saveData('chef_users', updatedUsers);
  };

  // Cascade category edits or deletions down to menu items
  const handleItemsCategoryReset = (oldCategoryName: string, newCategoryName: string) => {
    const updatedItems = items.map((item) => {
      if (item.category === oldCategoryName) {
        return { ...item, category: newCategoryName };
      }
      return item;
    });
    handleItemsChange(updatedItems);
  };

  // Shortcut from header to trigger opening the new menu item modal
  const handleAddShortcutClick = () => {
    setCurrentTab('menu-items');
    setTimeout(() => {
      setIsAddModalOpen(true);
    }, 50);
  };

  // Count active pending/preparing orders for red badge in Top bar
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'preparing'
  ).length;

  // If user is not authenticated, show DineFlow Login View
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.userRole === 'ADMIN';

  // Role-based view authorization: WAITER is locked strictly to 'orders' view
  const safeTab = (!isAdmin && currentTab !== 'orders') ? 'orders' : currentTab;

  return (
    <div className="flex min-h-screen bg-surf-bg text-text-primary font-sans" id="chef-app-root">
      
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar 
        currentTab={safeTab} 
        onTabChange={setCurrentTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Container - Offsets left by sidebar width (w-64 = 16rem) */}
      <div className="flex-1 ml-64 min-w-0 flex flex-col min-h-screen" id="chef-main-viewport">
        
        {/* Persistent Top Navbar with Search & Shortcuts */}
        <Header
          currentTab={safeTab}
          onTabChange={setCurrentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddShortcutClick={handleAddShortcutClick}
          pendingOrdersCount={pendingOrdersCount}
          apiEnabled={apiSettings.enabled}
          apiConnected={apiConnected}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Core Tab Routing Pages */}
        <main className="flex-1 pb-12" id="chef-content-stage">
          {safeTab === 'menu-items' && isAdmin && (
            <MenuItemsView
              items={items}
              categories={categories}
              modifiers={modifiers}
              searchQuery={searchQuery}
              onItemsChange={handleItemsChange}
              isAddModalOpen={isAddModalOpen}
              setIsAddModalOpen={setIsAddModalOpen}
            />
          )}

          {safeTab === 'categories' && isAdmin && (
            <CategoriesView
              categories={categories}
              items={items}
              onCategoriesChange={handleCategoriesChange}
              onItemsCategoryReset={handleItemsCategoryReset}
            />
          )}

          {safeTab === 'modifiers' && isAdmin && (
            <ModifiersView
              modifiers={modifiers}
              items={items}
              onModifiersChange={handleModifiersChange}
            />
          )}

          {safeTab === 'orders' && (
            <OrdersView
              orders={orders}
              items={items}
              modifiers={modifiers}
              onOrdersChange={handleOrdersChange}
              userRole={currentUser.userRole}
            />
          )}

          {safeTab === 'reports' && isAdmin && (
            <ReportsView 
              orders={orders} 
              items={items} 
              categories={categories} 
            />
          )}

          {safeTab === 'users' && isAdmin && (
            <UsersView 
              users={users}
              onUsersChange={handleUsersChange}
              apiEnabled={apiSettings.enabled}
            />
          )}

          {safeTab === 'support' && isAdmin && (
            <SupportView
              items={items}
              categories={categories}
              onItemsChange={handleItemsChange}
              onCategoriesChange={handleCategoriesChange}
              apiSettings={apiSettings}
              onApiSettingsChange={(newSettings) => {
                setApiSettings(newSettings);
                saveApiSettings(newSettings);
                loadAllData(newSettings);
              }}
              isApiLoading={isApiLoading}
              apiStatusMessage={apiStatusMessage}
              setApiStatusMessage={setApiStatusMessage}
            />
          )}
        </main>
      </div>
    </div>
  );
}
