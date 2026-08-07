import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MenuItemsView from './components/MenuItemsView';
import CategoriesView from './components/CategoriesView';
import ModifiersView from './components/ModifiersView';
import OrdersView from './components/OrdersView';
import ReportsView from './components/ReportsView';
import SupportView from './components/SupportView';

import { MenuItem, Category, Modifier, Order } from './types';
import {
  INITIAL_MENU_ITEMS,
  INITIAL_CATEGORIES,
  INITIAL_MODIFIERS,
  INITIAL_ORDERS,
  loadData,
  saveData
} from './data';
import { SpringBootSettings, getApiSettings, saveApiSettings, apiCategories, apiMenuItems, apiOrders } from './api';

export default function App() {
  // Navigation & Search State
  const [currentTab, setCurrentTab] = useState<string>('menu-items');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Core Data States
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Spring Boot Integration States
  const [apiSettings, setApiSettings] = useState<SpringBootSettings>(getApiSettings());
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [apiStatusMessage, setApiStatusMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);

  // Menu items Add Modal global trigger
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
      let catErrorMsg = '';
      let itemsErrorMsg = '';
      let ordersErrorMsg = '';
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
        catErrorMsg = err.message || 'Network error';
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
        itemsErrorMsg = err.message || 'Network error';
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
        ordersErrorMsg = err.message || 'Network error';
        setOrders(loadData<Order[]>('chef_orders', INITIAL_ORDERS));
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
        const added = updatedOrders.filter(uo => !orders.some(o => o.id === uo.id));
        const statusChanged = updatedOrders.filter(uo => {
          const matched = orders.find(o => o.id === uo.id);
          return matched && matched.status !== uo.status;
        });

        for (const newOrd of added) {
          try {
            const res = await apiOrders.create(newOrd);
            if (res && res.id) {
              newOrd.id = String(res.id);
              newOrd.orderNumber = res.orderNumber || newOrd.orderNumber;
              newOrd.orderStatus = res.orderStatus || newOrd.orderStatus;
              newOrd.subtotal = res.subtotal;
              newOrd.taxAmount = res.taxAmount;
              newOrd.totalAmount = res.totalAmount;
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

        setOrders([...updatedOrders]);
        saveData('chef_orders', updatedOrders);
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
    // Switch to menu-items tab first, then open modal
    setCurrentTab('menu-items');
    // Give it a tiny delay to allow tab render transition if necessary
    setTimeout(() => {
      setIsAddModalOpen(true);
    }, 50);
  };

  // Count active pending/preparing orders for red badge in Top bar
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'preparing'
  ).length;

  return (
    <div className="flex min-h-screen bg-surf-bg text-text-primary font-sans" id="chef-app-root">
      
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Container - Offsets left by sidebar width (w-64 = 16rem) */}
      <div className="flex-1 ml-64 min-w-0 flex flex-col min-h-screen" id="chef-main-viewport">
        
        {/* Persistent Top Navbar with Search & Shortcuts */}
        <Header
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddShortcutClick={handleAddShortcutClick}
          pendingOrdersCount={pendingOrdersCount}
          apiEnabled={apiSettings.enabled}
          apiConnected={apiConnected}
        />

        {/* Core Tab Routing Pages */}
        <main className="flex-1 pb-12" id="chef-content-stage">
          {currentTab === 'menu-items' && (
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

          {currentTab === 'categories' && (
            <CategoriesView
              categories={categories}
              items={items}
              onCategoriesChange={handleCategoriesChange}
              onItemsCategoryReset={handleItemsCategoryReset}
            />
          )}

          {currentTab === 'modifiers' && (
            <ModifiersView
              modifiers={modifiers}
              items={items}
              onModifiersChange={handleModifiersChange}
            />
          )}

          {currentTab === 'orders' && (
            <OrdersView
              orders={orders}
              items={items}
              modifiers={modifiers}
              onOrdersChange={handleOrdersChange}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView 
              orders={orders} 
              items={items} 
              categories={categories} 
            />
          )}

          {currentTab === 'support' && (
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
