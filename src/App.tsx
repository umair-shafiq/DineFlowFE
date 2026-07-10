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
import { SpringBootSettings, getApiSettings, saveApiSettings, apiCategories, apiMenuItems } from './api';

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
    
    // Always load local modifiers and orders
    setModifiers(loadData<Modifier[]>('chef_modifiers', INITIAL_MODIFIERS));
    setOrders(loadData<Order[]>('chef_orders', INITIAL_ORDERS));

    if (settingsToUse.enabled) {
      try {
        // Query live categories and dishes in parallel
        const [fetchedCategories, fetchedItems] = await Promise.all([
          apiCategories.list(),
          apiMenuItems.list()
        ]);
        
        setCategories(fetchedCategories);
        setItems(fetchedItems);
        setApiConnected(true);
        setApiStatusMessage({
          type: 'success',
          text: `Successfully connected to Spring Boot REST API! Loaded ${fetchedCategories.length} categories and ${fetchedItems.length} menu items.`
        });
      } catch (err: any) {
        console.warn('Failed to connect to Spring Boot server. Falling back to local offline DB.', err);
        setApiConnected(false);
        setApiStatusMessage({
          type: 'error',
          text: `Failed to connect to Spring Boot server at ${settingsToUse.baseUrl}. Using offline Local Storage backup instead. Check details in the Support tab.`
        });
        
        // Secure failover: Load offline data from LocalStorage
        setCategories(loadData<Category[]>('chef_categories', INITIAL_CATEGORIES));
        setItems(loadData<MenuItem[]>('chef_menu_items', INITIAL_MENU_ITEMS));
      } finally {
        setIsApiLoading(false);
      }
    } else {
      // Offline mode - Load directly from LocalStorage
      setCategories(loadData<Category[]>('chef_categories', INITIAL_CATEGORIES));
      setItems(loadData<MenuItem[]>('chef_menu_items', INITIAL_MENU_ITEMS));
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
          const res = await apiMenuItems.create(item);
          if (res && res.id) {
            item.id = res.id;
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
          const res = await apiCategories.create({ name: cat.name });
          if (res && res.id) {
            cat.id = res.id;
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

  const handleOrdersChange = (updatedOrders: Order[]) => {
    setOrders(updatedOrders);
    saveData('chef_orders', updatedOrders);
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
