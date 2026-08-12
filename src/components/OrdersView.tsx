import React, { useState } from 'react';
import { MenuItem, Modifier, Order, OrderItem } from '../types';
import { Plus, Minus, Clipboard, ShoppingCart, Check, Play, Ban, Sparkles, User, Hash, X, Search, Zap, RefreshCw, Eye, CheckCircle2, Utensils, ShoppingBag } from 'lucide-react';
import { apiOrders } from '../api';

interface OrdersViewProps {
  orders: Order[];
  items: MenuItem[];
  modifiers: Modifier[];
  onOrdersChange: (updatedOrders: Order[]) => void;
}

export default function OrdersView({
  orders,
  items,
  modifiers,
  onOrdersChange
}: OrdersViewProps) {
  
  // Terminal Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedOrderType, setSelectedOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState('Table 01');
  const [customerName, setCustomerName] = useState('');
  
  // Modifiers Dialog State
  const [activeCustomizingItem, setActiveCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedModifiersForActiveItem, setSelectedModifiersForActiveItem] = useState<Modifier[]>([]);
  
  // Kanban/Terminal Display Tab
  const [displayMode, setDisplayMode] = useState<'board' | 'create'>('board');
  const [activeBoardFilter, setActiveBoardFilter] = useState<'all' | 'pending' | 'preparing' | 'completed' | 'cancelled'>('all');

  // Order Lookup & Active Filter States
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeEndpointMode, setActiveEndpointMode] = useState<'all' | 'active'>('all');
  const [isLoadingActive, setIsLoadingActive] = useState(false);

  // Fetch active orders specifically using GET /api/orders/active
  const handleFetchActiveOrders = async () => {
    setActiveEndpointMode('active');
    setIsLoadingActive(true);
    try {
      const activeList = await apiOrders.listActive();
      if (Array.isArray(activeList) && activeList.length > 0) {
        onOrdersChange(activeList);
      }
    } catch (err: any) {
      console.warn('Failed GET /api/orders/active, using local active filter:', err);
    } finally {
      setIsLoadingActive(false);
    }
  };

  // Fetch all orders specifically using GET /api/orders
  const handleFetchAllOrders = async () => {
    setActiveEndpointMode('all');
    setIsLoadingActive(true);
    try {
      const allList = await apiOrders.list();
      if (Array.isArray(allList) && allList.length > 0) {
        onOrdersChange(allList);
      }
    } catch (err: any) {
      console.warn('Failed GET /api/orders, using local filter:', err);
    } finally {
      setIsLoadingActive(false);
    }
  };

  // Search single order by Ticket using GET /api/orders/{ticket}
  const handleSearchOrderByTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchOrderId.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchedOrder(null);

    // Search locally first in loaded orders array
    const cleanQuery = query.toLowerCase();
    const localMatch = orders.find(o => 
      String(o.orderNumber || '').toLowerCase() === cleanQuery ||
      String(o.id || '').toLowerCase() === cleanQuery ||
      String(o.orderId || '').toLowerCase() === cleanQuery ||
      String(o.orderNumber || '').toLowerCase() === `ord-${cleanQuery}`
    );

    try {
      const result = await apiOrders.get(query);
      if (result && (result.id || result.orderNumber)) {
        setSearchedOrder(result);
      } else if (localMatch) {
        setSearchedOrder(localMatch);
      } else {
        setSearchError(`Order ticket "${query}" not found (404 Not Found).`);
      }
    } catch (err: any) {
      if (localMatch) {
        setSearchedOrder(localMatch);
      } else {
        const is404 = err.status === 404 || String(err.message || '').includes('404');
        const errMsg = is404 
          ? `Order ticket "${query}" not found (404 Not Found).`
          : `Order ticket "${query}" not found (${err.message || '404 Not Found'}).`;
        setSearchError(errMsg);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Find linked modifiers for a menu item
  const getLinkedModifiers = (item: MenuItem): Modifier[] => {
    if (!item.modifiers) return [];
    return modifiers.filter(mod => item.modifiers?.includes(mod.id));
  };

  // Add Item to cart logic
  const handleAddToCart = (item: MenuItem) => {
    if (item.outOfStock) return;

    const linkedMods = getLinkedModifiers(item);
    
    // If it has modifiers, we open the customizer dialog first!
    if (linkedMods.length > 0) {
      setActiveCustomizingItem(item);
      setSelectedModifiersForActiveItem([]);
    } else {
      // Add immediately with zero modifiers
      addOrderItemToCart(item, []);
    }
  };

  const addOrderItemToCart = (item: MenuItem, selectedMods: Modifier[]) => {
    const modStringId = selectedMods.map(m => m.id).sort().join(',');
    const cartItemId = `${item.id}-${modStringId}`;

    const existingIndex = cart.findIndex(ci => ci.id === cartItemId);
    
    const modifierTotalCost = selectedMods.reduce((sum, m) => sum + m.price, 0);
    const itemUnitPrice = item.price + modifierTotalCost;

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      const newOrderItem: OrderItem = {
        id: cartItemId,
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        price: itemUnitPrice,
        selectedModifiers: selectedMods.map(m => ({ id: m.id, name: m.name, price: m.price }))
      };
      setCart([...cart, newOrderItem]);
    }
  };

  // Complete customization
  const handleConfirmCustomization = () => {
    if (activeCustomizingItem) {
      addOrderItemToCart(activeCustomizingItem, selectedModifiersForActiveItem);
      setActiveCustomizingItem(null);
      setSelectedModifiersForActiveItem([]);
    }
  };

  // Toggle modifier selection in customization modal
  const handleToggleCustomizerMod = (mod: Modifier) => {
    if (selectedModifiersForActiveItem.some(m => m.id === mod.id)) {
      setSelectedModifiersForActiveItem(selectedModifiersForActiveItem.filter(m => m.id !== mod.id));
    } else {
      setSelectedModifiersForActiveItem([...selectedModifiersForActiveItem, mod]);
    }
  };

  // Modify quantity in cart
  const handleUpdateQuantity = (cartItemId: string, change: number) => {
    const updated = cart.map(ci => {
      if (ci.id === cartItemId) {
        const newQuantity = ci.quantity + change;
        return { ...ci, quantity: newQuantity };
      }
      return ci;
    }).filter(ci => ci.quantity > 0);
    
    setCart(updated);
  };

  // Remove single item completely from cart
  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(cart.filter(ci => ci.id !== cartItemId));
  };

  // Cart total price
  const cartTotal = cart.reduce((sum, ci) => sum + (ci.price * ci.quantity), 0);

  // Place Order Action
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const isDineIn = selectedOrderType === 'DINE_IN';
    const tableIdNum = isDineIn ? (parseInt(tableNumber.replace(/\D/g, '')) || 2) : undefined;
    const tableStr = isDineIn ? (tableNumber.trim() || `Table 0${tableIdNum}`) : 'Takeaway';

    const newOrder: Order = {
      id: 'order-' + Date.now(),
      orderNumber: (orders.length + 1001).toString(),
      items: cart,
      total: cartTotal,
      status: 'pending',
      orderStatus: 'PLACED',
      orderType: selectedOrderType,
      createdAt: new Date().toISOString(),
      tableNumber: tableStr,
      restaurantTableId: tableIdNum,
      customerName: customerName.trim() || (isDineIn ? tableStr : 'Takeaway Customer')
    };

    onOrdersChange([newOrder, ...orders]);
    setCart([]);
    setCustomerName('');
    setTableNumber('Table 02');
    setSelectedOrderType('DINE_IN');
    setDisplayMode('board'); // Return to daily order board
  };

  // Advance Order Status Flow
  const handleAdvanceStatus = (orderId: string, nextStatus: 'preparing' | 'completed' | 'cancelled') => {
    const updated = orders.map(ord => {
      if (ord.id === orderId) {
        return { ...ord, status: nextStatus };
      }
      return ord;
    });
    onOrdersChange(updated);
  };

  // Filters daily orders
  const filteredOrders = orders.filter(ord => {
    if (activeEndpointMode === 'active') {
      const isActive = ord.status === 'pending' || ord.status === 'preparing';
      if (!isActive) return false;
    }
    if (activeBoardFilter === 'all') return true;
    return ord.status === activeBoardFilter;
  });

  return (
    <div className="px-10 py-6" id="orders-view">
      
      {/* View Selector Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-semibold text-[32px] text-brand-primary leading-tight mb-1">
            Kitchen Orders & Terminal
          </h1>
          <p className="text-text-secondary text-sm font-medium">
            Track daily incoming tickets, advance preparation steps, or place mock dining orders.
          </p>
        </div>

        {/* Board vs Create Terminal Switcher */}
        <div className="flex bg-surf-container p-1 rounded-lg w-fit shadow-inner">
          <button
            onClick={() => setDisplayMode('board')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              displayMode === 'board'
                ? 'bg-white text-brand-secondary shadow-sm font-extrabold'
                : 'text-text-secondary hover:text-brand-primary'
            }`}
          >
            Daily Order Board ({orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length} Active)
          </button>
          <button
            onClick={() => setDisplayMode('create')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              displayMode === 'create'
                ? 'bg-white text-brand-secondary shadow-sm font-extrabold'
                : 'text-text-secondary hover:text-brand-primary'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>New Order Terminal</span>
          </button>
        </div>
      </div>

      {/* DISPLAY MODE 1: KITCHEN ORDER TRACKING BOARD */}
      {displayMode === 'board' && (
        <div className="space-y-6">
          
          {/* Kitchen Queue Control Toolbar */}
          <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Queue Mode Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-sans font-bold text-text-secondary uppercase tracking-wider mr-1">View Mode:</span>
              <button
                type="button"
                onClick={handleFetchActiveOrders}
                disabled={isLoadingActive}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeEndpointMode === 'active'
                    ? 'bg-brand-secondary text-white shadow-sm'
                    : 'bg-surf-low hover:bg-surf-container border border-border-subtle text-text-secondary'
                }`}
              >
                {isLoadingActive && activeEndpointMode === 'active' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>Active Kitchen Queue</span>
              </button>

              <button
                type="button"
                onClick={handleFetchAllOrders}
                disabled={isLoadingActive}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeEndpointMode === 'all'
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'bg-surf-low hover:bg-surf-container border border-border-subtle text-text-secondary'
                }`}
              >
                {isLoadingActive && activeEndpointMode === 'all' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clipboard className="w-3.5 h-3.5" />}
                <span>All Orders History</span>
              </button>
            </div>

            {/* Ticket Lookup */}
            <form onSubmit={handleSearchOrderByTicket} className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Order Ticket (e.g. ORD-D95B43B0)..."
                  className="w-full bg-surf-low border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-brand-secondary outline-none text-text-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchOrderId.trim()}
                className="bg-brand-primary text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-brand-primary/90 transition-colors disabled:opacity-50 active-scale"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                <span>Find Ticket</span>
              </button>
            </form>
          </div>

          {/* Search Result Modal / Error Callout */}
          {searchError && (
            <div className="bg-brand-accent-red/10 border border-brand-accent-red/25 rounded-xl p-4 text-brand-accent-red text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Ban className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
              <button onClick={() => setSearchError(null)} className="p-1 hover:bg-brand-accent-red/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {searchedOrder && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white border border-border-subtle rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-brand-secondary/10 text-brand-secondary p-2 rounded-xl">
                      <Clipboard className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-display font-bold text-base text-brand-primary">
                        Order #{searchedOrder.orderNumber || searchedOrder.id}
                      </h3>
                      <p className="text-text-secondary text-xs">{searchedOrder.customerName || searchedOrder.tableNumber}</p>
                    </div>
                  </div>
                  <button onClick={() => setSearchedOrder(null)} className="text-text-secondary hover:text-brand-primary p-1 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-surf-low p-3 rounded-xl border border-border-subtle font-sans">
                    <div><span className="text-text-secondary">Ticket #:</span> <strong className="text-brand-primary font-mono ml-1">{searchedOrder.orderNumber || searchedOrder.orderId || searchedOrder.id}</strong></div>
                    <div><span className="text-text-secondary">Order Type:</span> <strong className="text-brand-primary font-mono ml-1 uppercase">{searchedOrder.orderType || (searchedOrder.restaurantTableId ? 'DINE_IN' : 'TAKEAWAY')}</strong></div>
                    <div><span className="text-text-secondary">Table:</span> <strong className="text-brand-primary font-mono ml-1">{searchedOrder.tableNumber}</strong></div>
                    <div><span className="text-text-secondary">Status:</span> <strong className="text-brand-secondary uppercase ml-1">{searchedOrder.status}</strong></div>
                    <div className="col-span-2"><span className="text-text-secondary">Placed:</span> <strong className="text-brand-primary ml-1">{new Date(searchedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                  </div>

                  <div>
                    <h4 className="font-bold text-text-primary mb-1.5">Order Items ({searchedOrder.items.length}):</h4>
                    <div className="bg-surf-low p-3 rounded-xl space-y-2 border border-border-subtle max-h-48 overflow-y-auto">
                      {searchedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-medium text-text-primary">{item.quantity}x {item.name}</span>
                          <span className="font-mono font-bold text-brand-primary">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-2 space-y-1 text-xs">
                    {searchedOrder.subtotal !== undefined && searchedOrder.subtotal > 0 && (
                      <div className="flex justify-between text-text-secondary">
                        <span>Subtotal:</span>
                        <span className="font-mono">${searchedOrder.subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {searchedOrder.taxAmount !== undefined && searchedOrder.taxAmount > 0 && (
                      <div className="flex justify-between text-text-secondary">
                        <span>Tax Amount:</span>
                        <span className="font-mono">${searchedOrder.taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-brand-primary pt-1.5 border-t border-border-subtle">
                      <span>Total Amount:</span>
                      <span className="text-brand-secondary font-mono">${(searchedOrder.totalAmount || searchedOrder.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSearchedOrder(null)}
                    className="w-full bg-brand-primary text-white font-bold h-10 rounded-xl hover:bg-brand-primary/90 transition-colors shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status filters */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-border-subtle pb-3">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'pending', label: 'Pending (Amber)' },
              { id: 'preparing', label: 'Preparing (Blue)' },
              { id: 'completed', label: 'Completed (Green)' },
              { id: 'cancelled', label: 'Cancelled (Gray)' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setActiveBoardFilter(btn.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  activeBoardFilter === btn.id
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'bg-white hover:bg-surf-low border border-border-subtle text-text-secondary'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Empty State */}
          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-border-subtle rounded-xl p-8 text-center shadow-sm">
              <Clipboard className="w-14 h-14 text-text-secondary/30 mb-4" />
              <h3 className="font-display text-lg font-bold text-brand-primary mb-1">No Orders Found</h3>
              <p className="text-text-secondary max-w-sm text-sm mb-6">
                There are no orders matching this status filter. Switch to the New Order Terminal to submit some simulation receipts.
              </p>
              <button
                onClick={() => setDisplayMode('create')}
                className="bg-brand-secondary text-white font-semibold text-sm h-10 px-4 rounded-lg flex items-center gap-2 hover:bg-brand-secondary-hover transition-colors active-scale"
              >
                <Plus className="w-4 h-4" />
                <span>Open Cart Terminal</span>
              </button>
            </div>
          )}

          {/* Kanban / Cards stream */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              // Map statuses to styling colors
              const statusColors = {
                pending: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-500 text-white', text: 'text-amber-800' },
                preparing: { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-500 text-white', text: 'text-blue-800' },
                completed: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-500 text-white', text: 'text-emerald-800' },
                cancelled: { bg: 'bg-gray-50 border-gray-200', badge: 'bg-gray-400 text-white', text: 'text-gray-800' }
              }[order.status] || { bg: 'bg-white', badge: 'bg-gray-500', text: 'text-gray-700' };

              return (
                <div
                  key={order.id}
                  id={`order-ticket-${order.orderNumber}`}
                  className={`border rounded-xl shadow-sm overflow-hidden flex flex-col bg-white transition-all ${statusColors.bg}`}
                >
                  {/* Card Ticket Header */}
                  <div className="px-5 py-3 border-b border-border-subtle/50 flex justify-between items-center bg-white/70">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono text-xs font-bold text-text-secondary">
                          TICKET #{order.orderNumber}
                        </p>
                        <span className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          order.orderType === 'TAKEAWAY' || (!order.restaurantTableId && order.tableNumber === 'Takeaway')
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {order.orderType || (order.restaurantTableId ? 'DINE_IN' : 'TAKEAWAY')}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-brand-primary text-sm flex items-center gap-1.5">
                        <span className="text-brand-secondary">{order.tableNumber}</span>
                        {order.customerName && (
                          <span className="text-xs text-text-secondary font-medium">• {order.customerName}</span>
                        )}
                      </h4>
                    </div>
                    <span className={`font-mono text-[9px] font-bold tracking-wider px-2 py-0.5 rounded uppercase ${statusColors.badge}`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Order Items list */}
                  <div className="px-5 py-4 flex-1 space-y-3 bg-white/30">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="font-sans text-xs font-bold text-brand-primary">
                            <span className="text-brand-secondary font-mono mr-1">{item.quantity}x</span>
                            <span>{item.name}</span>
                          </p>
                          {/* Modifiers List */}
                          {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                            <div className="pl-5 mt-0.5 space-y-0.5">
                              {item.selectedModifiers.map((mod, mIdx) => (
                                <p key={mIdx} className="font-mono text-[10px] text-text-secondary leading-tight">
                                  + {mod.name} {mod.price > 0 && `(+$${mod.price.toFixed(2)})`}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="font-mono text-xs text-text-secondary shrink-0">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total, Subtotal, Tax and Time */}
                  <div className="px-5 py-3 bg-surf-low/40 border-t border-border-subtle/40 space-y-1 text-xs">
                    {order.subtotal !== undefined && order.subtotal > 0 && (
                      <div className="flex justify-between text-text-secondary text-[11px]">
                        <span>Subtotal:</span>
                        <span className="font-mono">${order.subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {order.taxAmount !== undefined && order.taxAmount > 0 && (
                      <div className="flex justify-between text-text-secondary text-[11px]">
                        <span>Tax:</span>
                        <span className="font-mono">${order.taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-sans font-bold text-brand-primary pt-0.5">
                      <span className="font-mono text-text-secondary">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p>
                        Total: <span className="font-mono text-sm text-brand-secondary font-extrabold">${(order.totalAmount || order.total).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="px-5 py-3 bg-white border-t border-border-subtle/50 flex gap-2">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAdvanceStatus(order.id, 'preparing')}
                          className="flex-1 bg-brand-secondary text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 hover:bg-brand-secondary-hover transition-colors active-scale"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Cooking</span>
                        </button>
                        <button
                          onClick={() => handleAdvanceStatus(order.id, 'cancelled')}
                          className="px-3 py-2 bg-brand-accent-red/5 text-brand-accent-red rounded-lg text-xs hover:bg-brand-accent-red/10 transition-colors active-scale"
                          title="Cancel Order"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {order.status === 'preparing' && (
                      <>
                        <button
                          onClick={() => handleAdvanceStatus(order.id, 'completed')}
                          className="flex-1 bg-brand-accent-green text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 hover:bg-brand-accent-green/90 transition-colors active-scale"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Complete Ticket</span>
                        </button>
                        <button
                          onClick={() => handleAdvanceStatus(order.id, 'cancelled')}
                          className="px-3 py-2 bg-brand-accent-red/5 text-brand-accent-red rounded-lg text-xs hover:bg-brand-accent-red/10 transition-colors active-scale"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {(order.status === 'completed' || order.status === 'cancelled') && (
                      <span className="text-center w-full text-xs font-bold text-text-secondary/60 py-1.5 select-none">
                        Ticket Closed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DISPLAY MODE 2: SIMULATION WAITER / CART TERMINAL */}
      {displayMode === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left 7 Columns: Menu Selectors */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm">
              <h3 className="font-display font-bold text-brand-primary text-base mb-3">
                Select Dishes for Order
              </h3>
              
              {/* Menu items list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-2 no-scrollbar">
                {items.map((item) => (
                  <button
                    key={item.id}
                    disabled={item.outOfStock}
                    onClick={() => handleAddToCart(item)}
                    className={`text-left p-3 border border-border-subtle rounded-lg flex gap-3 transition-all ${
                      item.outOfStock
                        ? 'opacity-40 cursor-not-allowed bg-surf-low/30'
                        : 'bg-white hover:border-brand-secondary hover:shadow-sm active-scale cursor-pointer'
                    }`}
                  >
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-cover rounded bg-surf-low shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-sans font-bold text-brand-primary text-xs line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="font-mono text-xs font-semibold text-brand-secondary mt-0.5">
                        ${item.price.toFixed(2)}
                      </p>
                      <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider block mt-1">
                        {typeof item.category === 'object' ? ((item.category as any).name || 'Uncategorized') : (item.category || 'Uncategorized')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Cart & Dining Info Form */}
          <div className="lg:col-span-5 bg-white border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col h-fit">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
              <ShoppingCart className="w-5 h-5 text-brand-secondary" />
              <h3 className="font-display font-bold text-brand-primary text-base">
                Dining Cart ({cart.reduce((sum, ci) => sum + ci.quantity, 0)} Items)
              </h3>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <ShoppingCart className="w-10 h-10 text-text-secondary/30 mx-auto" />
                <p className="text-text-secondary text-xs font-medium">Cart is empty.</p>
                <p className="text-[11px] text-text-secondary/70">Click on menu dishes on the left to customize and add them here.</p>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-5">
                
                {/* Cart list */}
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {cart.map((ci) => (
                    <div key={ci.id} className="flex justify-between items-start gap-4 p-2.5 bg-surf-low/50 rounded-lg text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-bold text-brand-primary line-clamp-1">
                          {ci.name}
                        </p>
                        {ci.selectedModifiers.length > 0 && (
                          <div className="pl-3 mt-0.5 space-y-0.5">
                            {ci.selectedModifiers.map((mod, mIdx) => (
                              <p key={mIdx} className="font-mono text-[9px] text-text-secondary">
                                + {mod.name}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="font-mono text-brand-secondary font-bold mt-1 text-[11px]">
                          ${ci.price.toFixed(2)} each
                        </p>
                      </div>

                      {/* Quantity adjusting */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.id, -1)}
                          className="p-1 hover:bg-surf-container text-text-secondary hover:text-brand-primary rounded transition-colors active-scale"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-brand-primary text-xs w-4 text-center">
                          {ci.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.id, 1)}
                          className="p-1 hover:bg-surf-container text-text-secondary hover:text-brand-primary rounded transition-colors active-scale"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(ci.id)}
                          className="ml-1 text-[10px] text-brand-accent-red font-semibold hover:underline px-1"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info Fields */}
                <div className="border-t border-border-subtle/50 pt-4 space-y-3.5">
                  {/* Order Type Toggle */}
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                      Order Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderType('DINE_IN')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                          selectedOrderType === 'DINE_IN'
                            ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                            : 'bg-surf-low text-text-secondary border-border-subtle hover:bg-surf-container'
                        }`}
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>DINE IN</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderType('TAKEAWAY')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                          selectedOrderType === 'TAKEAWAY'
                            ? 'bg-brand-secondary text-white border-brand-secondary shadow-xs'
                            : 'bg-surf-low text-text-secondary border-border-subtle hover:bg-surf-container'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>TAKEAWAY</span>
                      </button>
                    </div>
                  </div>

                  <div className={`grid ${selectedOrderType === 'DINE_IN' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    {/* Table Input (Only shown for DINE_IN) */}
                    {selectedOrderType === 'DINE_IN' && (
                      <div className="space-y-1">
                        <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5" />
                          <span>Table #</span>
                        </label>
                        <input
                          type="text"
                          required={selectedOrderType === 'DINE_IN'}
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          className="w-full bg-surf-low border border-border-subtle rounded-lg p-2 text-xs focus:ring-1 focus:ring-brand-secondary outline-none font-sans"
                          placeholder="e.g. Table 02"
                        />
                      </div>
                    )}

                    {/* Guest Name */}
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>Guest Name</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-surf-low border border-border-subtle rounded-lg p-2 text-xs focus:ring-1 focus:ring-brand-secondary outline-none font-sans"
                        placeholder={selectedOrderType === 'TAKEAWAY' ? "e.g. Customer Name" : "e.g. Socrates"}
                      />
                    </div>
                  </div>
                </div>

                {/* Total and Submit */}
                <div className="border-t border-border-subtle/50 pt-4 space-y-3.5">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-text-primary">Cart Total</span>
                    <span className="font-mono text-brand-secondary text-base font-bold">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 bg-brand-secondary text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-brand-secondary-hover transition-colors text-xs shadow-md shadow-brand-secondary/15 active-scale"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Place Order & Send to Kitchen</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODIFIER SELECTION POPUP DRAWER */}
      {activeCustomizingItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-brand-primary/50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setActiveCustomizingItem(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-border-subtle animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-border-subtle bg-surf-low flex justify-between items-center">
              <div>
                <h3 className="font-display font-extrabold text-brand-primary text-base">
                  Customize Option
                </h3>
                <p className="text-xs text-brand-secondary font-semibold font-mono">
                  {activeCustomizingItem.name}
                </p>
              </div>
              <button 
                onClick={() => setActiveCustomizingItem(null)}
                className="p-1 rounded-full hover:bg-surf-container text-text-secondary hover:text-brand-primary active-scale"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of customizers */}
            <div className="p-5 space-y-3 max-h-64 overflow-y-auto">
              <span className="font-sans text-[10px] font-bold text-text-secondary tracking-wider block mb-1 uppercase">
                Choose Options:
              </span>
              {getLinkedModifiers(activeCustomizingItem).map((mod) => {
                const isSelected = selectedModifiersForActiveItem.some(m => m.id === mod.id);
                return (
                  <label
                    key={mod.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-secondary bg-brand-secondary/5 text-brand-secondary font-bold'
                        : 'border-border-subtle bg-white text-text-primary hover:bg-surf-low'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleCustomizerMod(mod)}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center text-white text-[10px] ${
                      isSelected ? 'bg-brand-secondary border-brand-secondary' : 'border-border-subtle'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                    </div>
                    <span className="flex-1 text-xs">{mod.name}</span>
                    <span className="font-mono text-xs font-bold">
                      {mod.price === 0 ? 'FREE' : `+$${mod.price.toFixed(2)}`}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-border-subtle/50 flex gap-3">
              <button
                type="button"
                onClick={() => setActiveCustomizingItem(null)}
                className="flex-1 py-2.5 rounded-lg border border-border-subtle text-xs font-bold text-text-secondary hover:bg-surf-low transition-colors active-scale"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomization}
                className="flex-1 py-2.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/95 transition-colors active-scale"
              >
                Add to Cart (+${selectedModifiersForActiveItem.reduce((sum, m) => sum + m.price, 0).toFixed(2)})
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
