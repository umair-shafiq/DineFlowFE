import React from 'react';
import { Bell, Settings, Plus, LogOut, ShoppingBag } from 'lucide-react';
import { AuthUser } from '../types';
import CurrencySelector from './CurrencySelector';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onAddShortcutClick: () => void;
  onAddOrderShortcutClick?: () => void;
  pendingOrdersCount: number;
  apiEnabled?: boolean;
  apiConnected?: boolean | null;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Header({
  currentTab,
  onTabChange,
  onAddShortcutClick,
  onAddOrderShortcutClick,
  pendingOrdersCount,
  apiEnabled = false,
  apiConnected = null,
  currentUser,
  onLogout
}: HeaderProps) {
  const isAdmin = currentUser?.userRole === 'ADMIN';
  const isChef = currentUser?.userRole === 'CHEF';

  // Human-friendly title for the active selected section
  const getSectionLabel = (tab: string) => {
    switch (tab) {
      case 'reports': return 'Dashboard';
      case 'kitchen': return 'Kitchen';
      case 'orders': return 'Orders';
      case 'invoices': return 'Invoices';
      case 'reservations': return 'Reservations';
      case 'tables': return 'Tables';
      case 'menu-items': return 'Menu Items';
      case 'categories': return 'Categories';
      case 'modifiers': return 'Modifiers';
      case 'users': return 'Staff';
      case 'support': return 'Settings';
      default: return tab.replace('-', ' ');
    }
  };

  return (
    <header 
      id="header"
      className="sticky top-0 w-full max-w-full h-16 bg-white border-b border-border-subtle flex justify-between items-center px-4 sm:px-6 lg:px-8 z-40 shadow-xs select-none"
    >
      {/* Brand & Selected Option Only */}
      <div className="flex items-center gap-3 shrink-0" id="header-left">
        <span 
          onClick={() => onTabChange(isAdmin ? 'reports' : (isChef ? 'kitchen' : 'orders'))}
          className="font-display text-lg font-black text-brand-primary tracking-tight cursor-pointer hover:opacity-85 select-none shrink-0"
        >
          DineFlow
        </span>
        <span className="text-border-subtle/80 select-none">/</span>
        <span className="text-xs font-bold text-brand-secondary bg-brand-secondary/10 px-2.5 py-1 rounded-lg capitalize shrink-0 tracking-wide">
          {getSectionLabel(currentTab)}
        </span>
      </div>
      
      {/* Actions & Utilities - Clean, spacious right-side bar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0" id="header-right">
        {/* Currency Switcher */}
        <CurrencySelector />

        {/* Notifications and Settings */}
        <div className="flex items-center gap-1" id="header-utility-buttons">
          {/* Notifications */}
          <button 
            id="header-notifications-btn"
            onClick={() => onTabChange('orders')}
            className="p-2 hover:bg-surf-container rounded-xl text-text-secondary transition-colors relative active-scale cursor-pointer"
            title="Pending Orders"
          >
            <Bell className="w-4 h-4" />
            {pendingOrdersCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand-accent-red text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {pendingOrdersCount}
              </span>
            )}
          </button>
          
          {/* Settings Shortcut (Admin only) */}
          {isAdmin && (
            <button 
              id="header-settings-btn"
              onClick={() => onTabChange('support')}
              className="p-2 hover:bg-surf-container rounded-xl text-text-secondary transition-colors active-scale cursor-pointer"
              title="API & System Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Spring Boot Connection Status Indicator */}
        {apiEnabled && (
          <button
            id="header-db-status-btn"
            onClick={() => onTabChange(isAdmin ? 'support' : 'orders')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold tracking-tight transition-all active-scale ${
              apiConnected === true
                ? 'bg-brand-accent-green/5 border-brand-accent-green/25 text-brand-accent-green'
                : apiConnected === false
                ? 'bg-brand-accent-red/5 border-brand-accent-red/25 text-brand-accent-red'
                : 'bg-surf-container border-border-subtle text-text-secondary animate-pulse'
            }`}
            title="Spring Boot API Connection Status"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              apiConnected === true
                ? 'bg-brand-accent-green animate-pulse'
                : apiConnected === false
                ? 'bg-brand-accent-red'
                : 'bg-text-secondary/50'
            }`} />
            <span>DB: {apiConnected === true ? 'Online' : apiConnected === false ? 'Offline' : 'Checking'}</span>
          </button>
        )}

        {/* Quick Action Buttons (Admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            {/* Quick Add New Order Button */}
            {onAddOrderShortcutClick && (
              <button 
                id="header-new-order-btn"
                onClick={onAddOrderShortcutClick}
                className="bg-brand-secondary hover:bg-brand-secondary/90 text-white text-xs font-semibold h-8.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors active-scale shrink-0 cursor-pointer shadow-xs"
                title="Create New Dining Order"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>New Order</span>
              </button>
            )}

            {/* Quick Add Menu Item Button */}
            <button 
              id="header-add-item-btn"
              onClick={onAddShortcutClick}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold h-8.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors active-scale shrink-0 cursor-pointer shadow-xs"
              title="Add New Menu Item"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        )}

        {/* User Role Badge & Signout */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-border-subtle/80 select-none">
            <div className="hidden lg:block text-right">
              <p className="text-xs font-bold text-brand-primary leading-tight">
                {currentUser.fullName || currentUser.email.split('@')[0]}
              </p>
              <p className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                {currentUser.userRole}
              </p>
            </div>
            {onLogout && (
              <button
                id="header-logout-btn"
                onClick={onLogout}
                className="p-2 hover:bg-brand-accent-red/10 text-text-secondary hover:text-brand-accent-red rounded-xl transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
