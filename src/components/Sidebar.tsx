import React from 'react';
import { ChefHat, UtensilsCrossed, Layers, Sliders, ClipboardList, BarChart3, HelpCircle, LogOut } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ currentTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: 'menu-items', label: 'Menu Items', icon: UtensilsCrossed },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'modifiers', label: 'Modifiers', icon: Sliders },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const bottomItems = [
    { id: 'support', label: 'Support', icon: HelpCircle },
    { id: 'logout', label: 'Reset Demo', icon: LogOut },
  ];

  return (
    <aside 
      id="sidebar"
      className="fixed left-0 top-0 h-screen w-64 bg-surf-low border-r border-border-subtle flex flex-col py-6 z-50 transition-all"
    >
      {/* Brand Header */}
      <div className="px-6 mb-8" id="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary rounded flex items-center justify-center text-white shadow-sm">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-brand-primary tracking-tight leading-tight">
              Kitchen Admin
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
              Main Terminal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-3 space-y-1" id="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              id={`sidebar-btn-${item.id}`}
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-lg active-scale text-sm font-medium ${
                isActive
                  ? 'bg-brand-secondary text-white font-semibold shadow-md shadow-brand-secondary/15'
                  : 'text-text-secondary hover:bg-surf-container hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto px-3 space-y-1" id="sidebar-bottom">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              id={`sidebar-btn-${item.id}`}
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-lg text-sm font-medium ${
                isActive
                  ? 'bg-brand-secondary/10 text-brand-secondary font-semibold'
                  : item.id === 'logout'
                  ? 'text-brand-accent-red hover:bg-brand-accent-red/5'
                  : 'text-text-secondary hover:bg-surf-container hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
