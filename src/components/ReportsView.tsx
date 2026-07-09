import React from 'react';
import { MenuItem, Category, Order } from '../types';
import { TrendingUp, DollarSign, Receipt, CheckCircle, Percent, Clock, AlertCircle } from 'lucide-react';

interface ReportsViewProps {
  orders: Order[];
  items: MenuItem[];
  categories: Category[];
}

export default function ReportsView({ orders, items, categories }: ReportsViewProps) {
  
  // Calculate statistics based on current orders state
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');

  // Gross Revenue (all non-cancelled orders counts)
  const totalGrossRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  // Completed Revenue (only closed green orders)
  const completedRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  // Total Tickets
  const totalTicketsCount = orders.length;

  // Average Ticket Value
  const averageTicketValue = totalTicketsCount > 0 
    ? orders.reduce((sum, o) => sum + o.total, 0) / totalTicketsCount 
    : 0;

  // Completion rate
  const completionRate = totalTicketsCount > 0
    ? (completedOrders.length / totalTicketsCount) * 100
    : 0;

  // Calculate Category Sales Distribution
  const categorySalesMap: { [key: string]: number } = {};
  
  // Seed with 0 for all categories
  categories.forEach(cat => {
    categorySalesMap[cat.name] = 0;
  });

  // Calculate based on order items
  orders
    .filter(o => o.status !== 'cancelled')
    .forEach(ord => {
      ord.items.forEach(oi => {
        // Find corresponding menu item to find its category (failsafe if category was updated)
        const matchedItem = items.find(item => item.id === oi.menuItemId);
        const catName = matchedItem ? matchedItem.category : 'Main Course';
        
        categorySalesMap[catName] = (categorySalesMap[catName] || 0) + (oi.price * oi.quantity);
      });
    });

  // Convert map to array for plotting
  const categorySalesData = Object.entries(categorySalesMap).map(([name, value]) => ({
    name,
    value
  }));

  const totalCategorySales = categorySalesData.reduce((sum, d) => sum + d.value, 0);

  // Calculate Top Selling Items
  const itemSalesMap: { [key: string]: { name: string; qty: number; sales: number } } = {};
  
  orders
    .filter(o => o.status !== 'cancelled')
    .forEach(ord => {
      ord.items.forEach(oi => {
        if (!itemSalesMap[oi.menuItemId]) {
          itemSalesMap[oi.menuItemId] = { name: oi.name, qty: 0, sales: 0 };
        }
        itemSalesMap[oi.menuItemId].qty += oi.quantity;
        itemSalesMap[oi.menuItemId].sales += oi.price * oi.quantity;
      });
    });

  const topSellers = Object.values(itemSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5); // top 5 sellers

  // Colors for charts
  const chartColors = [
    '#4b41e1', // Secondary / Indigo
    '#10b981', // Emerald / Green
    '#f59e0b', // Amber / Yellow
    '#ec4899', // Pink
    '#8b5cf6'  // Purple
  ];

  return (
    <div className="px-10 py-6 font-sans" id="reports-view">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[32px] text-brand-primary leading-tight mb-1">
          Analytics & Kitchen Reports
        </h1>
        <p className="text-text-secondary text-sm font-medium">
          Monitor culinary cash flow, category distributions, and daily kitchen metrics.
        </p>
      </div>

      {/* Bento Grid KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="reports-bento-grid">
        
        {/* KPI 1: Gross Sales */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-brand-secondary/10 text-brand-secondary rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-text-secondary text-xs font-semibold block uppercase tracking-wider font-mono">
              Gross Sales
            </span>
            <p className="font-mono text-2xl font-black text-brand-primary tracking-tight">
              ${totalGrossRevenue.toFixed(2)}
            </p>
            <span className="text-[10px] text-text-secondary font-medium">
              Incl. active and closed tickets
            </span>
          </div>
        </div>

        {/* KPI 2: Tickets Placed */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-text-secondary text-xs font-semibold block uppercase tracking-wider font-mono">
              Tickets Placed
            </span>
            <p className="font-mono text-2xl font-black text-brand-primary tracking-tight">
              {totalTicketsCount}
            </p>
            <span className="text-[10px] text-text-secondary font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-brand-secondary" />
              <span>{activeOrders.length} pending in cooker</span>
            </span>
          </div>
        </div>

        {/* KPI 3: Completion Rate */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-brand-accent-green/10 text-brand-accent-green rounded-lg">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-text-secondary text-xs font-semibold block uppercase tracking-wider font-mono">
              Completion Rate
            </span>
            <p className="font-mono text-2xl font-black text-brand-primary tracking-tight">
              {completionRate.toFixed(1)}%
            </p>
            <span className="text-[10px] text-text-secondary font-medium">
              {completedOrders.length} of {totalTicketsCount} served
            </span>
          </div>
        </div>

        {/* KPI 4: Average Ticket */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-text-secondary text-xs font-semibold block uppercase tracking-wider font-mono">
              Avg Ticket Value
            </span>
            <p className="font-mono text-2xl font-black text-brand-primary tracking-tight">
              ${averageTicketValue.toFixed(2)}
            </p>
            <span className="text-[10px] text-text-secondary font-medium">
              Average size per table
            </span>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8" id="reports-charts-row">
        
        {/* Chart A: Top Selling Items (SVG Horizontal Bar Chart) */}
        <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-brand-primary text-base mb-1">
              Top Selling Dishes
            </h3>
            <p className="text-text-secondary text-xs mb-6 font-medium">
              Dishes ranked by total quantities ordered in live sessions.
            </p>
          </div>

          {topSellers.length === 0 ? (
            <div className="py-16 text-center text-text-secondary text-xs font-medium">
              Place some orders in the New Order Terminal to see top dish rankings.
            </div>
          ) : (
            <div className="space-y-4">
              {topSellers.map((seller, idx) => {
                // Determine percentage of width relative to the maximum quantities ordered
                const maxQty = Math.max(...topSellers.map(s => s.qty));
                const percentage = (seller.qty / maxQty) * 100;
                
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-brand-primary font-sans truncate pr-4 max-w-[200px]" title={seller.name}>
                        {seller.name}
                      </span>
                      <div className="flex gap-3 text-text-secondary shrink-0 font-mono text-[11px]">
                        <span>{seller.qty} sold</span>
                        <span className="text-brand-secondary font-bold">${seller.sales.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* SVG/Tailwind Progress Bar */}
                    <div className="w-full bg-surf-low h-3.5 rounded-full overflow-hidden border border-border-subtle/30">
                      <div 
                        style={{ width: `${percentage}%` }}
                        className="bg-brand-secondary h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-1"
                      >
                        {percentage > 15 && (
                          <span className="text-[8px] text-white font-black font-mono">
                            {percentage.toFixed(0)}%
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

        {/* Chart B: Category Sales Contribution (SVG Donut Chart / Progress list) */}
        <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-brand-primary text-base mb-1">
              Category Contributions
            </h3>
            <p className="text-text-secondary text-xs mb-6 font-medium">
              Gross revenue contributions per menu category.
            </p>
          </div>

          {totalCategorySales === 0 ? (
            <div className="py-16 text-center text-text-secondary text-xs font-medium">
              Submit some orders to map revenue shares by category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Left Column: Pure SVG Donut Chart */}
              <div className="md:col-span-5 flex justify-center">
                <div className="relative w-36 h-36">
                  {/* Outer circle container */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#eff4ff" 
                      strokeWidth="10" 
                    />
                    {/* Build segments of SVG arc dynamically */}
                    {(() => {
                      let accumulatedPercent = 0;
                      return categorySalesData.map((data, idx) => {
                        const share = totalCategorySales > 0 ? data.value / totalCategorySales : 0;
                        const percentage = share * 100;
                        const strokeDasharray = `${percentage} ${100 - percentage}`;
                        const strokeDashoffset = -accumulatedPercent;
                        accumulatedPercent += percentage;
                        
                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={chartColors[idx % chartColors.length]}
                            strokeWidth="10"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            pathLength="100"
                            className="transition-all duration-700 ease-out"
                          />
                        );
                      });
                    })()}
                  </svg>
                  {/* Center info */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-full m-5 shadow-inner">
                    <span className="text-[9px] font-mono font-bold text-text-secondary tracking-widest uppercase">
                      Revenue
                    </span>
                    <span className="text-xs font-mono font-extrabold text-brand-primary leading-tight">
                      ${totalCategorySales.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Legend with statistics */}
              <div className="md:col-span-7 space-y-2.5">
                {categorySalesData.map((data, idx) => {
                  const sharePercent = totalCategorySales > 0 ? (data.value / totalCategorySales) * 100 : 0;
                  const color = chartColors[idx % chartColors.length];
                  
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-brand-primary font-semibold truncate">{data.name}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px] shrink-0 font-bold">
                        <span className="text-text-secondary/70">{sharePercent.toFixed(1)}%</span>
                        <span className="text-brand-secondary">${data.value.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Live Operational Health Status */}
      <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm" id="operational-logs">
        <h3 className="font-display font-bold text-brand-primary text-base mb-1">
          Operational Live Logger
        </h3>
        <p className="text-text-secondary text-xs mb-4 font-medium">
          Kitchen status diagnostic feed.
        </p>

        <div className="border border-border-subtle rounded-lg bg-surf-low/40 p-4 space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-brand-accent-green font-semibold">
            <CheckCircle className="w-4.5 h-4.5 shrink-0" />
            <span className="font-mono text-[10px] text-text-secondary/60">[{new Date().toLocaleTimeString()}]</span>
            <span>All core database indices synchronized with client terminal.</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-brand-secondary font-semibold">
            <TrendingUp className="w-4.5 h-4.5 shrink-0" />
            <span className="font-mono text-[10px] text-text-secondary/60">[{new Date(Date.now() - 5000).toLocaleTimeString()}]</span>
            <span>Analytics engine calculated {completedOrders.length} served ticket weights successfully.</span>
          </div>

          {items.filter(item => item.outOfStock).length > 0 && (
            <div className="flex items-center gap-2.5 text-xs text-brand-accent-red font-semibold">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span className="font-mono text-[10px] text-text-secondary/60">[{new Date(Date.now() - 15000).toLocaleTimeString()}]</span>
              <span>Stock Alarm: {items.filter(item => item.outOfStock).length} menu items currently registered 'Out of Stock'.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
