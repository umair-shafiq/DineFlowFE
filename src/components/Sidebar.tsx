import React from 'react';
import { 
  ChefHat, 
  UtensilsCrossed, 
  Layers, 
  Sliders, 
  ClipboardList, 
  BarChart3, 
  HelpCircle, 
  LogOut, 
  Users, 
  Shield, 
  UserCheck 
} from 'lucide-react';
import { AuthUser } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export default function Sidebar({ currentTab, onTabChange, currentUser, onLogout }: SidebarProps) {
  const isAdmin = currentUser?.userRole === 'ADMIN';

  // Admin sees full suite of tools; Waiter sees only Orders (view only)
  const adminMenuItems = [
    { id: 'reports', label: 'Dashboard', icon: BarChart3 },
    { id: 'orders', label: 'Orders Terminal', icon: ClipboardList },
    { id: 'menu-items', label: 'Menu Items', icon: UtensilsCrossed },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'modifiers', label: 'Modifiers', icon: Sliders },
    { id: 'users', label: 'User Staff', icon: Users },
  ];

  const waiterMenuItems = [
    { id: 'orders', label: 'Live Orders Queue', icon: ClipboardList },
  ];

  const menuItems = isAdmin ? adminMenuItems : waiterMenuItems;

  const bottomItems = isAdmin ? [
    { id: 'support', label: 'API & Settings', icon: HelpCircle },
  ] : [];

  return (
    <aside 
      id="sidebar"
      className="fixed left-0 top-0 h-screen w-64 bg-surf-low border-r border-border-subtle flex flex-col py-6 z-50 transition-all shadow-xs"
    >
      {/* Brand Header */}
      <div className="px-6 mb-6" id="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-md shadow-brand-primary/15">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg text-brand-primary tracking-tight leading-tight">
              DineFlow
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
              {isAdmin ? 'Admin Console' : 'Waiter Station'}
            </p>
          </div>
        </div>
      </div>

      {/* Logged-In User Profile Card */}
      {currentUser && (
        <div className="mx-3 mb-6 p-3 bg-white border border-border-subtle rounded-xl shadow-xs" id="sidebar-user-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surf-container border border-border-subtle flex items-center justify-center font-bold text-brand-primary text-xs uppercase shrink-0">
              {currentUser.fullName ? currentUser.fullName.slice(0, 2) : (currentUser.email ? currentUser.email.slice(0, 2) : 'DF')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-brand-primary truncate">
                {currentUser.fullName || currentUser.email.split('@')[0]}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                  isAdmin 
                    ? 'bg-indigo-100 text-indigo-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {isAdmin ? <Shield className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                  <span>{currentUser.userRole}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation menu */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto" id="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              id={`sidebar-btn-${item.id}`}
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl active-scale text-sm font-medium cursor-pointer ${
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
      <div className="mt-auto px-3 space-y-1 pt-4 border-t border-border-subtle/70" id="sidebar-bottom">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              id={`sidebar-btn-${item.id}`}
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-sm font-medium cursor-pointer ${
                isActive
                  ? 'bg-brand-secondary/10 text-brand-secondary font-semibold'
                  : 'text-text-secondary hover:bg-surf-container hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Logout Button */}
        {onLogout && (
          <button
            id="sidebar-btn-logout"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl text-sm font-medium text-brand-accent-red hover:bg-brand-accent-red/10 cursor-pointer"
            title="Log out from session"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
