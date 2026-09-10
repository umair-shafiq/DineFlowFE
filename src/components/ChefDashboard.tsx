import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChefHat, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  Flame, 
  Hourglass, 
  Search, 
  Filter, 
  Check, 
  AlertCircle, 
  Utensils, 
  Volume2, 
  VolumeX, 
  ArrowUpDown, 
  Sparkles,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { KitchenOrder, KitchenOrderItem, KitchenItemStatus, AuthUser } from '../types';
import { apiKitchen } from '../api';

interface ChefDashboardProps {
  orders: KitchenOrder[];
  onOrdersChange: (orders: KitchenOrder[]) => void;
  currentUser?: AuthUser | null;
  apiEnabled?: boolean;
}

export default function ChefDashboard({ 
  orders, 
  onOrdersChange, 
  currentUser,
  apiEnabled = true 
}: ChefDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'READY'>('ACTIVE');
  const [sortOrder, setSortOrder] = useState<'OLDEST_FIRST' | 'NEWEST_FIRST'>('NEWEST_FIRST');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Play audio chime when triggered (if enabled)
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before interaction
    }
  };

  // Refresh kitchen orders from API
  const handleRefresh = async (silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const liveOrders = await apiKitchen.getOrders();
      // Check if new orders arrived
      if (liveOrders.length > orders.length && soundEnabled) {
        playChime();
      }
      onOrdersChange(liveOrders);
      if (!silent) {
        showNotification(`Updated: ${liveOrders.length} kitchen tickets loaded.`);
      }
    } catch (err: any) {
      console.warn('Could not fetch kitchen orders from API:', err);
      if (!silent) {
        showNotification(err.message || 'Failed to refresh kitchen orders.', 'error');
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const refreshRef = useRef(handleRefresh);
  refreshRef.current = handleRefresh;

  // Polling interval for kitchen display (auto-refresh)
  // Polls GET /api/kitchen/orders every 15s when enabled so newly created orders appear live
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshRef.current(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Update individual item status via PATCH /api/kitchen/order-items/{id}/status?status=...
  const handleUpdateItemStatus = async (
    orderId: number, 
    orderItemId: number, 
    newStatus: KitchenItemStatus
  ) => {
    setUpdatingItemId(orderItemId);
    try {
      // Call live backend API
      const updatedItem = await apiKitchen.updateItemStatus(orderItemId, newStatus);
      
      // Update local state smoothly
      const updatedOrders = orders.map((order) => {
        if (order.orderId !== orderId) return order;
        return {
          ...order,
          items: order.items.map((it) => 
            it.orderItemId === orderItemId 
              ? { ...it, itemStatus: updatedItem.itemStatus || newStatus } 
              : it
          )
        };
      });

      onOrdersChange(updatedOrders);
      showNotification(`Item marked as ${newStatus}`);
    } catch (err: any) {
      console.error('Failed to update kitchen item status:', err);
      // Fallback local update so kitchen chef can continue operating even if network hiccups
      const updatedOrders = orders.map((order) => {
        if (order.orderId !== orderId) return order;
        return {
          ...order,
          items: order.items.map((it) => 
            it.orderItemId === orderItemId 
              ? { ...it, itemStatus: newStatus } 
              : it
          )
        };
      });
      onOrdersChange(updatedOrders);
      showNotification(`Updated item to ${newStatus} (local fallback)`);
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Batch update all items on a ticket to a given status
  const handleBatchUpdateTicket = async (order: KitchenOrder, targetStatus: KitchenItemStatus) => {
    setUpdatingOrderId(order.orderId);
    try {
      const itemsToUpdate = order.items.filter((it) => it.itemStatus !== targetStatus);
      for (const item of itemsToUpdate) {
        await apiKitchen.updateItemStatus(item.orderItemId, targetStatus).catch(() => {});
      }

      const updatedOrders = orders.map((o) => {
        if (o.orderId !== order.orderId) return o;
        return {
          ...o,
          items: o.items.map((it) => ({ ...it, itemStatus: targetStatus }))
        };
      });

      onOrdersChange(updatedOrders);
      showNotification(`All items in #${order.orderNumber || order.orderId} marked as ${targetStatus}`);
    } catch (err: any) {
      console.error('Batch update failed:', err);
      // Local fallback
      const updatedOrders = orders.map((o) => {
        if (o.orderId !== order.orderId) return o;
        return {
          ...o,
          items: o.items.map((it) => ({ ...it, itemStatus: targetStatus }))
        };
      });
      onOrdersChange(updatedOrders);
      showNotification(`Updated ticket locally to ${targetStatus}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Kitchen Metrics
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let cookingCount = 0;
    let readyCount = 0;
    let activeTickets = 0;

    orders.forEach((o) => {
      let orderHasUnready = false;
      o.items.forEach((it) => {
        if (it.itemStatus === 'PENDING') {
          pendingCount += it.quantity;
          orderHasUnready = true;
        } else if (it.itemStatus === 'COOKING') {
          cookingCount += it.quantity;
          orderHasUnready = true;
        } else if (it.itemStatus === 'READY') {
          readyCount += it.quantity;
        }
      });
      if (orderHasUnready) {
        activeTickets += 1;
      }
    });

    return {
      pendingCount,
      cookingCount,
      readyCount,
      activeTickets,
      totalOrders: orders.length
    };
  }, [orders]);

  // Elapsed time helper with human-friendly units (m, h, d) and placed time
  const getElapsedTimeInfo = (createdAtRaw: any) => {
    let createdDate: Date;
    if (!createdAtRaw) {
      createdDate = new Date();
    } else if (createdAtRaw instanceof Date) {
      createdDate = createdAtRaw;
    } else if (typeof createdAtRaw === 'number') {
      createdDate = new Date(createdAtRaw);
    } else if (Array.isArray(createdAtRaw)) {
      const [y, m, d, h = 0, min = 0, s = 0] = createdAtRaw;
      createdDate = new Date(y, (m || 1) - 1, d || 1, h, min, s);
    } else {
      const parsed = new Date(createdAtRaw);
      createdDate = isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    const now = Date.now();
    const diffMs = Math.max(0, now - createdDate.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    
    // Human-friendly relative label (no more 3000m ago!)
    let label = '';
    if (diffMins === 0) {
      label = 'Just now';
    } else if (diffMins < 60) {
      label = `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      label = remainingMins > 0 ? `${hours}h ${remainingMins}m ago` : `${hours}h ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      const remHours = Math.floor((diffMins % 1440) / 60);
      label = remHours > 0 ? `${days}d ${remHours}h ago` : `${days}d ago`;
    }

    // Exact placement time formatted cleanly
    const isToday = createdDate.toDateString() === new Date().toDateString();
    const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const exactTime = isToday ? `Today, ${timeStr}` : `${createdDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;

    // Urgency level for kitchen ticket cards
    let level: 'normal' | 'warning' | 'urgent' = 'normal';
    let color = 'text-emerald-700 bg-emerald-50 border-emerald-200';

    if (diffMins >= 20 || diffMins >= 1440) {
      level = 'urgent';
      // Only pulse if placed today and over 20 mins; historical tickets don't pulse
      color = diffMins < 1440 
        ? 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse' 
        : 'text-rose-800 bg-rose-50/80 border-rose-200';
    } else if (diffMins >= 10) {
      level = 'warning';
      color = 'text-amber-700 bg-amber-50 border-amber-200';
    }

    return { mins: diffMins, label, exactTime, level, color };
  };

  // Filter and sort tickets
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Search query across table, order number, and dish names
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery = !query || 
          order.orderNumber?.toLowerCase().includes(query) ||
          order.tableNumber?.toLowerCase().includes(query) ||
          String(order.orderId).includes(query) ||
          order.items.some((it) => it.menuItemName?.toLowerCase().includes(query));

        if (!matchesQuery) return false;

        // Status filter
        const isAllReady = order.items.length > 0 && order.items.every((it) => it.itemStatus === 'READY');
        if (filterStatus === 'ACTIVE') return !isAllReady;
        if (filterStatus === 'READY') return isAllReady;
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'NEWEST_FIRST' ? timeB - timeA : timeA - timeB;
      });
  }, [orders, searchQuery, filterStatus, sortOrder]);

  return (
    <div 
      className={`p-6 max-w-7xl mx-auto space-y-6 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-surf-bg overflow-y-auto p-8 max-w-none' : ''
      }`}
      id="chef-dashboard-root"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border-subtle/80 pb-5" id="chef-header">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display font-black text-2xl text-brand-primary tracking-tight">
                Kitchen Display System (KDS)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                Live Kitchen
              </span>
            </div>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Real-time orders queue & preparation status control for culinary staff.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5" id="chef-controls">
          {/* Sound Alert Toggle */}
          <button
            id="chef-sound-toggle"
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs' 
                : 'bg-surf-low text-text-secondary border-border-subtle hover:bg-surf-container'
            }`}
            title={soundEnabled ? 'Kitchen chime enabled' : 'Kitchen chime muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 opacity-50" />}
            <span>{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
          </button>

          {/* Auto Refresh Switch */}
          <button
            id="chef-auto-refresh-toggle"
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              autoRefresh 
                ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-xs' 
                : 'bg-surf-low text-text-secondary border-border-subtle hover:bg-surf-container'
            }`}
            title={autoRefresh ? 'Background polling active: fetches new tickets every 15s. Click to pause.' : 'Polling paused. Click to enable background auto-sync.'}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-indigo-600 animate-ping' : 'bg-text-secondary/40'}`} />
            <span>{autoRefresh ? 'Auto Sync (15s): ON' : 'Auto Sync: OFF'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            id="chef-manual-refresh-btn"
            type="button"
            onClick={() => handleRefresh(false)}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Fetch latest tickets from backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Orders'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="chef-fullscreen-toggle"
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-surf-low hover:bg-surf-container text-text-secondary hover:text-brand-primary rounded-xl border border-border-subtle transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Kitchen Screen Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {notification && (
        <div 
          id="chef-notification-banner"
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all shadow-md animate-in fade-in ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Kitchen Status Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5" id="chef-metrics-grid">
        {/* Active Tickets */}
        <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold text-text-secondary tracking-wider">Active Tickets</p>
            <p className="font-display text-2xl font-black text-brand-primary mt-1">{metrics.activeTickets}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">out of {metrics.totalOrders} total</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        {/* Items Pending */}
        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between bg-amber-50/20">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold text-amber-800 tracking-wider">To Prepare (Pending)</p>
            <p className="font-display text-2xl font-black text-amber-700 mt-1">{metrics.pendingCount}</p>
            <p className="text-[11px] text-amber-800/70 mt-0.5">items awaiting chef</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Hourglass className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Items Cooking */}
        <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between bg-blue-50/20">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold text-blue-800 tracking-wider">On Fire (Cooking)</p>
            <p className="font-display text-2xl font-black text-blue-700 mt-1">{metrics.cookingCount}</p>
            <p className="text-[11px] text-blue-800/70 mt-0.5">actively in progress</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5 text-amber-500 animate-bounce" />
          </div>
        </div>

        {/* Items Ready */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between bg-emerald-50/20">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Ready for Table</p>
            <p className="font-display text-2xl font-black text-emerald-700 mt-1">{metrics.readyCount}</p>
            <p className="text-[11px] text-emerald-800/70 mt-0.5">plated & finished</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3" id="chef-filter-bar">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            id="chef-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table, order #, dish..."
            className="w-full pl-9 pr-4 py-2 bg-surf-low border border-border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-secondary/50 focus:ring-1 focus:ring-emerald-600 outline-none font-sans"
          />
          <Search className="w-4 h-4 text-text-secondary/70 absolute left-3 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Status Tabs */}
          <div className="flex items-center bg-surf-low p-1 rounded-xl border border-border-subtle text-xs font-medium">
            <button
              id="filter-active-tickets-btn"
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'ACTIVE' 
                  ? 'bg-white shadow-xs font-bold text-brand-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Needs Prep ({metrics.activeTickets})
            </button>
            <button
              id="filter-all-tickets-btn"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'ALL' 
                  ? 'bg-white shadow-xs font-bold text-brand-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All Tickets ({metrics.totalOrders})
            </button>
            <button
              id="filter-ready-tickets-btn"
              onClick={() => setFilterStatus('READY')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'READY' 
                  ? 'bg-white shadow-xs font-bold text-emerald-700' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Ready ({metrics.totalOrders - metrics.activeTickets})
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            id="chef-sort-toggle-btn"
            onClick={() => setSortOrder(sortOrder === 'NEWEST_FIRST' ? 'OLDEST_FIRST' : 'NEWEST_FIRST')}
            className="px-3 py-1.5 bg-surf-low hover:bg-surf-container border border-border-subtle rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-all cursor-pointer"
            title="Toggle chronological sorting"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'NEWEST_FIRST' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Orders Grid / Kitchen Tickets */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-2xl p-16 text-center shadow-xs" id="chef-empty-state">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-lg text-brand-primary">Kitchen Queue Clear</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto mt-1">
            {filterStatus === 'ACTIVE' 
              ? 'All current orders have been prepared and marked as Ready! New tickets from the waitstaff will appear here automatically.' 
              : 'No orders match the current filter or search criteria.'}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setFilterStatus('ALL'); }}
            className="mt-4 px-4 py-2 bg-surf-low hover:bg-surf-container border border-border-subtle rounded-xl text-xs font-semibold text-brand-primary cursor-pointer transition-all"
          >
            View All Order Tickets
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="chef-tickets-grid">
          {filteredOrders.map((order) => {
            const timeInfo = getElapsedTimeInfo(order.createdAt);
            const isAllReady = order.items.every((it) => it.itemStatus === 'READY');
            const hasCooking = order.items.some((it) => it.itemStatus === 'COOKING');
            const isBatchUpdating = updatingOrderId === order.orderId;

            return (
              <div 
                key={order.orderId}
                id={`kitchen-card-${order.orderId}`}
                className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                  isAllReady 
                    ? 'border-emerald-200/90 bg-emerald-50/10' 
                    : hasCooking
                    ? 'border-blue-300 shadow-sm ring-1 ring-blue-200'
                    : 'border-border-subtle hover:border-border-subtle/80'
                }`}
              >
                <div>
                  {/* Ticket Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-border-subtle/80 pb-3 mb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-xl text-brand-primary">
                          {order.tableNumber || `Table #${order.orderId}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-surf-container border border-border-subtle text-text-secondary uppercase">
                          {order.orderType || 'DINE_IN'}
                        </span>
                      </div>
                      <p className="font-mono text-xs font-bold text-text-secondary mt-0.5">
                        {order.orderNumber || `ORD-${order.orderId}`}
                      </p>
                    </div>

                    {/* Time Elapsed Badge */}
                    <div className="text-right flex flex-col items-end">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[11px] font-bold border ${timeInfo.color}`} title={timeInfo.exactTime}>
                        <Clock className="w-3 h-3" />
                        <span>{timeInfo.label}</span>
                      </span>
                      <span className="text-[10px] text-text-secondary mt-0.5 font-medium select-none">
                        {timeInfo.exactTime}
                      </span>
                      {isAllReady && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold font-mono text-emerald-700">
                          <Check className="w-3 h-3" /> ALL READY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2.5 mb-4">
                    {order.items.map((item) => {
                      const isItemUpdating = updatingItemId === item.orderItemId;

                      return (
                        <div 
                          key={item.orderItemId}
                          id={`kitchen-item-${item.orderItemId}`}
                          className={`p-3 rounded-xl border transition-all ${
                            item.itemStatus === 'READY'
                              ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                              : item.itemStatus === 'COOKING'
                              ? 'bg-blue-50/40 border-blue-200 text-blue-950'
                              : 'bg-surf-low/60 border-border-subtle text-text-primary'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            {/* Quantity & Dish Name */}
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className={`w-6 h-6 rounded-md font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                                item.itemStatus === 'READY'
                                  ? 'bg-emerald-600 text-white'
                                  : item.itemStatus === 'COOKING'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-brand-primary text-white'
                              }`}>
                                {item.quantity}x
                              </span>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold leading-tight ${item.itemStatus === 'READY' ? 'line-through opacity-70' : ''}`}>
                                  {item.menuItemName}
                                </p>
                                <span className="font-mono text-[10px] text-text-secondary/80">
                                  #{item.orderItemId}
                                </span>
                              </div>
                            </div>

                            {/* Current Status Pill */}
                            <div className="shrink-0">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase tracking-wide border ${
                                item.itemStatus === 'READY'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : item.itemStatus === 'COOKING'
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {item.itemStatus === 'COOKING' && <Flame className="w-2.5 h-2.5 text-amber-500" />}
                                {item.itemStatus === 'READY' && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                                {item.itemStatus === 'PENDING' && <Hourglass className="w-2.5 h-2.5 text-amber-600" />}
                                <span>{item.itemStatus}</span>
                              </span>
                            </div>
                          </div>

                          {/* Quick Action Buttons per Item */}
                          <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-border-subtle/50">
                            <span className="text-[10px] font-mono text-text-secondary">Update Status:</span>

                            <div className="flex items-center gap-1">
                              {/* If PENDING: Primary button to Cook */}
                              {item.itemStatus === 'PENDING' && (
                                <button
                                  id={`start-cooking-btn-${item.orderItemId}`}
                                  type="button"
                                  disabled={isItemUpdating}
                                  onClick={() => handleUpdateItemStatus(order.orderId, item.orderItemId, 'COOKING')}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                  <Flame className="w-3 h-3 text-amber-300" />
                                  <span>Start Cooking</span>
                                </button>
                              )}

                              {/* If COOKING: Primary button to Ready */}
                              {item.itemStatus === 'COOKING' && (
                                <button
                                  id={`mark-ready-btn-${item.orderItemId}`}
                                  type="button"
                                  disabled={isItemUpdating}
                                  onClick={() => handleUpdateItemStatus(order.orderId, item.orderItemId, 'READY')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Mark Ready</span>
                                </button>
                              )}

                              {/* If READY: Option to revert to Cooking if needed */}
                              {item.itemStatus === 'READY' && (
                                <button
                                  id={`revert-cooking-btn-${item.orderItemId}`}
                                  type="button"
                                  disabled={isItemUpdating}
                                  onClick={() => handleUpdateItemStatus(order.orderId, item.orderItemId, 'COOKING')}
                                  className="px-2 py-0.5 bg-surf-container hover:bg-surf-container/80 text-text-secondary rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                                  title="Revert back to cooking if item was updated by mistake"
                                >
                                  Revert
                                </button>
                              )}

                              {/* Manual Cycle Pill (PENDING -> COOKING -> READY) */}
                              <div className="flex items-center gap-0.5 ml-1 bg-surf-container/80 p-0.5 rounded-md text-[9px] font-mono">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemStatus(order.orderId, item.orderItemId, 'PENDING')}
                                  className={`px-1 py-0.5 rounded cursor-pointer ${item.itemStatus === 'PENDING' ? 'bg-amber-200 text-amber-900 font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                                  title="Set status to PENDING"
                                >
                                  P
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemStatus(order.orderId, item.orderItemId, 'COOKING')}
                                  className={`px-1 py-0.5 rounded cursor-pointer ${item.itemStatus === 'COOKING' ? 'bg-blue-200 text-blue-900 font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                                  title="Set status to COOKING"
                                >
                                  C
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemStatus(order.orderId, item.orderItemId, 'READY')}
                                  className={`px-1 py-0.5 rounded cursor-pointer ${item.itemStatus === 'READY' ? 'bg-emerald-200 text-emerald-900 font-bold' : 'text-text-secondary hover:text-text-primary'}`}
                                  title="Set status to READY"
                                >
                                  R
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ticket Bottom Batch Action Bar */}
                <div className="pt-3 border-t border-border-subtle/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-text-secondary uppercase">
                    Ticket Batch:
                  </span>

                  <div className="flex items-center gap-2">
                    {!isAllReady && (
                      <button
                        id={`cook-all-btn-${order.orderId}`}
                        type="button"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdateTicket(order, 'COOKING')}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        Cook All
                      </button>
                    )}

                    {!isAllReady && (
                      <button
                        id={`ready-all-btn-${order.orderId}`}
                        type="button"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdateTicket(order, 'READY')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        Ready All
                      </button>
                    )}

                    {isAllReady && (
                      <span className="text-[11px] font-mono font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Order Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
