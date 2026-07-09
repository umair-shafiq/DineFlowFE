import React from 'react';
import { Search, Bell, Settings, Plus } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddShortcutClick: () => void;
  pendingOrdersCount: number;
}

export default function Header({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onAddShortcutClick,
  pendingOrdersCount
}: HeaderProps) {
  
  // Mapping of main top bar links to our internal navigation states
  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', target: 'reports' },
    { id: 'inventory', label: 'Inventory', target: 'menu-items' },
    { id: 'staff', label: 'Staff', target: 'support' },
    { id: 'analytics', label: 'Analytics', target: 'reports' }
  ];

  // Detect which top-link is "active" based on currentTab
  const getActiveNavLink = () => {
    if (currentTab === 'menu-items' || currentTab === 'categories' || currentTab === 'modifiers') return 'inventory';
    if (currentTab === 'reports') return 'analytics';
    if (currentTab === 'support') return 'staff';
    return 'dashboard';
  };

  const activeLink = getActiveNavLink();

  return (
    <header 
      id="header"
      className="sticky top-0 w-full h-16 bg-white border-b border-border-subtle flex justify-between items-center px-10 z-40 shadow-sm"
    >
      {/* Brand & Inline Tabs */}
      <div className="flex items-center gap-10" id="header-left">
        <span 
          onClick={() => onTabChange('menu-items')}
          className="font-display text-xl font-extrabold text-brand-primary tracking-tight cursor-pointer hover:opacity-85 select-none"
        >
          ChefCommand
        </span>
        
        <nav className="hidden md:flex gap-6 h-16" id="header-nav-links">
          {navLinks.map((link) => {
            const isActive = activeLink === link.id;
            return (
              <button
                id={`header-nav-btn-${link.id}`}
                key={link.id}
                onClick={() => onTabChange(link.target)}
                className={`font-sans text-sm transition-all h-16 px-1 flex items-center relative hover:text-brand-secondary ${
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
      <div className="flex items-center gap-6" id="header-right">
        {/* Search Bar */}
        <div className="relative w-64" id="header-search">
          <input 
            type="text" 
            placeholder={`Search ${currentTab.replace('-', ' ')}...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-surf-low border border-border-subtle rounded-lg focus:ring-2 focus:ring-brand-secondary/35 focus:border-brand-secondary transition-all outline-none text-text-primary placeholder-text-secondary/60"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/70 w-4 h-4" />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {/* Notifications and Settings */}
        <div className="flex items-center gap-2" id="header-utility-buttons">
          {/* Notifications */}
          <button 
            onClick={() => onTabChange('orders')}
            className="p-2 hover:bg-surf-container rounded-full text-text-secondary transition-colors relative active-scale"
            title="Pending Orders"
          >
            <Bell className="w-5 h-5" />
            {pendingOrdersCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-accent-red text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {pendingOrdersCount}
              </span>
            )}
          </button>
          
          {/* Settings Shortcut */}
          <button 
            onClick={() => onTabChange('modifiers')}
            className="p-2 hover:bg-surf-container rounded-full text-text-secondary transition-colors active-scale"
            title="Configure Modifiers"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Add Button */}
        <button 
          onClick={onAddShortcutClick}
          className="bg-brand-primary text-white text-sm font-semibold h-9 px-4 rounded-lg flex items-center gap-2 hover:bg-brand-primary/90 transition-colors active-scale shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>

        {/* Chef Profile Avatar */}
        <div className="flex items-center gap-2 shrink-0 select-none">
          <img 
            src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=150&q=80" 
            alt="Chef Executive" 
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full border-2 border-border-subtle object-cover shadow-sm bg-surf-container" 
          />
        </div>
      </div>
    </header>
  );
}
