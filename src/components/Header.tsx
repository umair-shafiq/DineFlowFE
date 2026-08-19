import React from 'react';
import { Search, Bell, Settings, Plus, LogOut, Shield, UserCheck } from 'lucide-react';
import { AuthUser } from '../types';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddShortcutClick: () => void;
  pendingOrdersCount: number;
  apiEnabled?: boolean;
  apiConnected?: boolean | null;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export default function Header({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onAddShortcutClick,
  pendingOrdersCount,
  apiEnabled = false,
  apiConnected = null,
  currentUser,
  onLogout
}: HeaderProps) {
  const isAdmin = currentUser?.userRole === 'ADMIN';
  
  // Mapping of main top bar links to internal navigation states (for Admin)
  const adminNavLinks = [
    { id: 'dashboard', label: 'Dashboard', target: 'reports' },
    { id: 'orders', label: 'Orders', target: 'orders' },
    { id: 'inventory', label: 'Inventory', target: 'menu-items' },
    { id: 'users', label: 'Staff', target: 'users' },
  ];

  const waiterNavLinks = [
    { id: 'orders', label: 'Live Orders', target: 'orders' },
  ];

  const navLinks = isAdmin ? adminNavLinks : waiterNavLinks;

  // Detect which top-link is "active" based on currentTab
  const getActiveNavLink = () => {
    if (currentTab === 'menu-items' || currentTab === 'categories' || currentTab === 'modifiers') return 'inventory';
    if (currentTab === 'reports') return 'dashboard';
    if (currentTab === 'orders') return 'orders';
    if (currentTab === 'users') return 'users';
    if (currentTab === 'support') return 'settings';
    return 'dashboard';
  };

  const activeLink = getActiveNavLink();

  return (
    <header 
      id="header"
      className="sticky top-0 w-full h-16 bg-white border-b border-border-subtle flex justify-between items-center px-8 z-40 shadow-xs"
    >
      {/* Brand & Inline Tabs */}
      <div className="flex items-center gap-8" id="header-left">
        <span 
          onClick={() => onTabChange(isAdmin ? 'reports' : 'orders')}
          className="font-display text-xl font-black text-brand-primary tracking-tight cursor-pointer hover:opacity-85 select-none flex items-center gap-2"
        >
          <span>DineFlow</span>
        </span>
        
        <nav className="hidden md:flex gap-5 h-16" id="header-nav-links">
          {navLinks.map((link) => {
            const isActive = activeLink === link.id;
            return (
              <button
                id={`header-nav-btn-${link.id}`}
                key={link.id}
                onClick={() => onTabChange(link.target)}
                className={`font-sans text-sm transition-all h-16 px-1 flex items-center relative cursor-pointer hover:text-brand-secondary ${
                  isActive 
                    ? 'text-brand-secondary font-bold' 
                    : 'text-text-secondary font-medium'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand-secondary rounded-t-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Search & Actions */}
      <div className="flex items-center gap-4" id="header-right">
        {/* Search Bar */}
        <div className="relative w-56 lg:w-64" id="header-search">
          <input 
            type="text" 
            placeholder={`Search ${currentTab.replace('-', ' ')}...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-surf-low border border-border-subtle rounded-xl focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary transition-all outline-none text-text-primary placeholder:text-text-secondary/60"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/70 w-3.5 h-3.5" />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {/* Notifications and Settings */}
        <div className="flex items-center gap-1.5" id="header-utility-buttons">
          {/* Notifications */}
          <button 
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

        {/* Quick Add Button (Admin only) */}
        {isAdmin && (
          <button 
            onClick={onAddShortcutClick}
            className="bg-brand-primary text-white text-xs font-semibold h-8.5 px-3.5 rounded-xl flex items-center gap-1.5 hover:bg-brand-primary/90 transition-colors active-scale shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
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
