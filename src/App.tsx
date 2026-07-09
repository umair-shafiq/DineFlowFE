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

export default function App() {
  // Navigation & Search State
  const [currentTab, setCurrentTab] = useState<string>('menu-items');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Core Data States
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Menu items Add Modal global trigger
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Initialize and load persistent data
  useEffect(() => {
    setItems(loadData<MenuItem[]>('chef_menu_items', INITIAL_MENU_ITEMS));
    setCategories(loadData<Category[]>('chef_categories', INITIAL_CATEGORIES));
    setModifiers(loadData<Modifier[]>('chef_modifiers', INITIAL_MODIFIERS));
    setOrders(loadData<Order[]>('chef_orders', INITIAL_ORDERS));
  }, []);

  // Save changes to localStorage on any state changes
  const handleItemsChange = (updatedItems: MenuItem[]) => {
    setItems(updatedItems);
    saveData('chef_menu_items', updatedItems);
  };

  const handleCategoriesChange = (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    saveData('chef_categories', updatedCategories);
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
            <SupportView />
          )}
        </main>
      </div>
    </div>
  );
}
