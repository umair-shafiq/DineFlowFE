import React, { useState, useEffect, useMemo } from 'react';
import { 
  MenuItem, 
  Category, 
  Order,
  ReportSalesSummary,
  ReportMostOrderedItem,
  ReportRevenueByCategory,
  ReportPeakHour
} from '../types';
import { 
  TrendingUp, 
  Banknote, 
  Receipt, 
  Percent, 
  Clock, 
  Calendar,
  RefreshCw,
  Award,
  Layers,
  AlertCircle,
  Flame,
  HelpCircle
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { apiReports, getApiSettings } from '../api';
import { 
  INITIAL_REPORT_SALES, 
  INITIAL_REPORT_MOST_ORDERED, 
  INITIAL_REPORT_REVENUE_BY_CATEGORY, 
  INITIAL_REPORT_PEAK_HOURS 
} from '../data';

interface ReportsViewProps {
  orders: Order[];
  items: MenuItem[];
  categories: Category[];
  apiEnabled?: boolean;
  apiConnected?: boolean | null;
}

export default function ReportsView({ 
  orders, 
  items, 
  categories,
  apiEnabled = true,
  apiConnected = null
}: ReportsViewProps) {
  const { formatPrice, symbol } = useCurrency();

  // Date range filters (default to current month: September 2026)
  const [startDate, setStartDate] = useState<string>('2026-09-01T00:00:00');
  const [endDate, setEndDate] = useState<string>('2026-09-30T23:59:59');
  const [activeDatePreset, setActiveDatePreset] = useState<'month' | '30days' | 'today' | 'custom'>('month');

  // Limit for most-ordered-items endpoint
  const [itemLimit, setItemLimit] = useState<number>(5);

  // Loading & fetch statuses
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'api' | 'local' | 'fallback'>('api');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // States for the 4 reporting endpoints
  const [salesSummary, setSalesSummary] = useState<ReportSalesSummary>(INITIAL_REPORT_SALES);
  const [mostOrdered, setMostOrdered] = useState<ReportMostOrderedItem[]>(INITIAL_REPORT_MOST_ORDERED);
  const [revenueByCategory, setRevenueByCategory] = useState<ReportRevenueByCategory[]>(INITIAL_REPORT_REVENUE_BY_CATEGORY);
  const [peakHours, setPeakHours] = useState<ReportPeakHour[]>(INITIAL_REPORT_PEAK_HOURS);

  // Hover state for Peak Hours bar chart
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Helper to apply preset date ranges
  const applyDatePreset = (preset: 'month' | '30days' | 'today') => {
    setActiveDatePreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    if (preset === 'month') {
      // Current month bounds: 2026-09-01 to 2026-09-30
      const lastDayOfMonth = new Date(year, now.getMonth() + 1, 0).getDate();
      setStartDate(`${year}-${month}-01T00:00:00`);
      setEndDate(`${year}-${month}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59`);
    } else if (preset === 'today') {
      setStartDate(`${year}-${month}-${day}T00:00:00`);
      setEndDate(`${year}-${month}-${day}T23:59:59`);
    } else if (preset === '30days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pastYear = past30.getFullYear();
      const pastMonth = String(past30.getMonth() + 1).padStart(2, '0');
      const pastDay = String(past30.getDate()).padStart(2, '0');
      setStartDate(`${pastYear}-${pastMonth}-${pastDay}T00:00:00`);
      setEndDate(`${year}-${month}-${day}T23:59:59`);
    }
  };

  // Function to calculate metrics locally from active Orders & Items state as robust fallback
  const computeLocalFallback = () => {
    // 1. Sales Summary
    const nonCancelled = orders.filter(o => o.status !== 'cancelled');
    const computedTotalRevenue = nonCancelled.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
    const computedTax = nonCancelled.reduce((sum, o) => sum + (o.taxAmount || (o.total * 0.1)), 0);
    const computedSales: ReportSalesSummary = nonCancelled.length > 0 ? {
      totalOrders: nonCancelled.length,
      totalRevenue: computedTotalRevenue,
      totalTax: computedTax
    } : INITIAL_REPORT_SALES;

    // 2. Most Ordered Items
    const itemMap: { [key: string]: number } = {};
    nonCancelled.forEach(ord => {
      ord.items.forEach(it => {
        itemMap[it.name] = (itemMap[it.name] || 0) + (it.quantity || 1);
      });
    });
    const computedMostOrdered: ReportMostOrderedItem[] = Object.entries(itemMap).length > 0 
      ? Object.entries(itemMap)
          .map(([name, qty]) => ({ menuItemName: name, totalQuantitySold: qty }))
          .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
          .slice(0, itemLimit)
      : INITIAL_REPORT_MOST_ORDERED.slice(0, itemLimit);

    // 3. Revenue by Category
    const catRevenueMap: { [key: string]: number } = {};
    categories.forEach(c => { catRevenueMap[c.name] = 0; });
    nonCancelled.forEach(ord => {
      ord.items.forEach(oi => {
        const found = items.find(i => i.id === oi.menuItemId);
        const catName = found ? found.category : 'General';
        catRevenueMap[catName] = (catRevenueMap[catName] || 0) + (oi.price * oi.quantity);
      });
    });
    const computedCatRevenue: ReportRevenueByCategory[] = Object.entries(catRevenueMap).some(([_, v]) => v > 0)
      ? Object.entries(catRevenueMap)
          .map(([name, rev]) => ({ categoryName: name, totalRevenue: rev }))
          .filter(c => c.totalRevenue > 0)
      : INITIAL_REPORT_REVENUE_BY_CATEGORY;

    // 4. Peak Hours
    const hourMap: { [hour: number]: number } = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    nonCancelled.forEach(ord => {
      const d = new Date(ord.createdAt);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        hourMap[h] = (hourMap[h] || 0) + 1;
      }
    });
    const computedPeak: ReportPeakHour[] = Object.entries(hourMap)
      .map(([h, count]) => ({ hourOfDay: Number(h), orderCount: count }))
      .filter(p => p.orderCount > 0);

    return {
      sales: computedSales,
      mostOrdered: computedMostOrdered,
      revenueByCategory: computedCatRevenue,
      peakHours: computedPeak.length > 0 ? computedPeak : INITIAL_REPORT_PEAK_HOURS
    };
  };

  // Master fetch function coordinating the 4 endpoints
  const fetchReports = async (showLoadingSpinner: boolean = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setIsRefreshing(true);
    setFetchError(null);

    const settings = getApiSettings();

    // If API integration is toggled off, immediately use clean computed metrics
    if (!settings.enabled) {
      const fallback = computeLocalFallback();
      setSalesSummary(fallback.sales);
      setMostOrdered(fallback.mostOrdered);
      setRevenueByCategory(fallback.revenueByCategory);
      setPeakHours(fallback.peakHours);
      setDataSource('local');
      setLastUpdated(new Date().toLocaleTimeString());
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      // Concurrently execute all 4 reporting endpoints
      const [salesRes, mostOrderedRes, categoryRes, peakHoursRes] = await Promise.allSettled([
        apiReports.getSales(startDate, endDate),
        apiReports.getMostOrderedItems(itemLimit),
        apiReports.getRevenueByCategory(),
        apiReports.getPeakHours()
      ]);

      let successfulEndpointsCount = 0;

      // Handle Endpoint 1: Sales
      if (salesRes.status === 'fulfilled' && salesRes.value) {
        setSalesSummary(salesRes.value);
        successfulEndpointsCount++;
      } else {
        console.warn('Endpoint /api/reports/sales failed or returned error, using fallback');
      }

      // Handle Endpoint 2: Most Ordered Items
      if (mostOrderedRes.status === 'fulfilled' && Array.isArray(mostOrderedRes.value) && mostOrderedRes.value.length > 0) {
        setMostOrdered(mostOrderedRes.value);
        successfulEndpointsCount++;
      } else {
        console.warn('Endpoint /api/reports/most-ordered-items failed, using fallback');
      }

      // Handle Endpoint 3: Revenue by Category
      if (categoryRes.status === 'fulfilled' && Array.isArray(categoryRes.value) && categoryRes.value.length > 0) {
        setRevenueByCategory(categoryRes.value);
        successfulEndpointsCount++;
      } else {
        console.warn('Endpoint /api/reports/revenue-by-category failed, using fallback');
      }

      // Handle Endpoint 4: Peak Hours
      if (peakHoursRes.status === 'fulfilled' && Array.isArray(peakHoursRes.value) && peakHoursRes.value.length > 0) {
        setPeakHours(peakHoursRes.value);
        successfulEndpointsCount++;
      } else {
        console.warn('Endpoint /api/reports/peak-hours failed, using fallback');
      }

      // If at least one endpoint responded from Spring Boot, mark source as live
      if (successfulEndpointsCount > 0) {
        setDataSource('api');
        setFetchError(null);
      } else {
        const fallback = computeLocalFallback();
        setSalesSummary(fallback.sales);
        setMostOrdered(fallback.mostOrdered);
        setRevenueByCategory(fallback.revenueByCategory);
        setPeakHours(fallback.peakHours);
        setDataSource('fallback');
        setFetchError('Database server on port 8080 is unreachable. Displaying saved metrics.');
      }
    } catch (err: any) {
      console.error('Reports fetch error:', err);
      const fallback = computeLocalFallback();
      setSalesSummary(fallback.sales);
      setMostOrdered(fallback.mostOrdered);
      setRevenueByCategory(fallback.revenueByCategory);
      setPeakHours(fallback.peakHours);
      setDataSource('fallback');
      setFetchError(err?.message || 'Failed to connect to reports service.');
    } finally {
      setLastUpdated(new Date().toLocaleTimeString());
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load and re-fetch when date bounds or limit change
  useEffect(() => {
    fetchReports(true);
  }, [startDate, endDate, itemLimit]);

  // Derived Calculations
  const netRevenue = Math.max(0, salesSummary.totalRevenue - salesSummary.totalTax);
  const avgOrderValue = salesSummary.totalOrders > 0 
    ? salesSummary.totalRevenue / salesSummary.totalOrders 
    : 0;
  const taxPercentage = salesSummary.totalRevenue > 0 
    ? (salesSummary.totalTax / salesSummary.totalRevenue) * 100 
    : 0;

  // Max sold quantity for scaling progress bars
  const maxSoldQuantity = useMemo(() => {
    if (!mostOrdered || mostOrdered.length === 0) return 1;
    return Math.max(...mostOrdered.map(item => item.totalQuantitySold), 1);
  }, [mostOrdered]);

  // Category Total Revenue for percentage bars
  const totalCategoryRevenueSum = useMemo(() => {
    if (!revenueByCategory || revenueByCategory.length === 0) return 1;
    return revenueByCategory.reduce((sum, c) => sum + c.totalRevenue, 0);
  }, [revenueByCategory]);

  // Max order count across 24 hours for Peak Hours chart height
  const maxPeakOrderCount = useMemo(() => {
    if (!peakHours || peakHours.length === 0) return 1;
    return Math.max(...peakHours.map(p => p.orderCount), 1);
  }, [peakHours]);

  // Find the single peak rush hour
  const busiestHour = useMemo(() => {
    if (!peakHours || peakHours.length === 0) return null;
    return [...peakHours].sort((a, b) => b.orderCount - a.orderCount)[0];
  }, [peakHours]);

  // Format hour number (0 - 23) into friendly 12-hour format (e.g. 2 PM, 12 AM)
  const formatHourLabel = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Palettes for categories
  const categoryColors = [
    { bg: 'bg-brand-secondary/15', text: 'text-brand-secondary', bar: 'bg-brand-secondary' },
    { bg: 'bg-emerald-500/15', text: 'text-emerald-600', bar: 'bg-emerald-500' },
    { bg: 'bg-amber-500/15', text: 'text-amber-600', bar: 'bg-amber-500' },
    { bg: 'bg-purple-500/15', text: 'text-purple-600', bar: 'bg-purple-500' },
    { bg: 'bg-pink-500/15', text: 'text-pink-600', bar: 'bg-pink-500' },
    { bg: 'bg-cyan-500/15', text: 'text-cyan-600', bar: 'bg-cyan-500' }
  ];

  return (
    <div className="px-4 sm:px-8 lg:px-10 py-6 max-w-7xl mx-auto font-sans" id="admin-reports-view">
      
      {/* View Header & Meta Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6" id="reports-header-section">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-brand-primary tracking-tight">
              Reports & Executive Analytics
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-brand-secondary/10 text-brand-secondary">
              Manager View
            </span>
          </div>
          <p className="text-text-secondary text-xs sm:text-sm font-medium">
            Live sales performance, top-selling dishes, category revenue, and peak customer rush hours.
          </p>
        </div>

        {/* Sync Status & Refresh Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              dataSource === 'api'
                ? 'bg-brand-accent-green/10 border-brand-accent-green/25 text-brand-accent-green'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-600'
            }`}
            title={`Status: ${dataSource === 'api' ? 'Live database connected' : 'Offline local mode'}`}
          >
            <span className={`w-2 h-2 rounded-full ${dataSource === 'api' ? 'bg-brand-accent-green animate-pulse' : 'bg-amber-500'}`} />
            <span>{dataSource === 'api' ? 'Live Connected' : 'Offline / Cached'}</span>
          </div>

          <button
            id="reports-refresh-btn"
            onClick={() => fetchReports(false)}
            disabled={isRefreshing}
            className="h-9 px-3.5 bg-white border border-border-subtle rounded-xl text-text-primary text-xs font-semibold hover:bg-surf-container flex items-center gap-1.5 transition-all active-scale shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-secondary' : 'text-text-secondary'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-white border border-border-subtle rounded-2xl p-4 mb-8 shadow-xs" id="reports-date-filter-bar">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Quick Presets */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5 mr-1 font-mono uppercase tracking-wider shrink-0">
              <Calendar className="w-3.5 h-3.5 text-brand-secondary" />
              <span>Range:</span>
            </span>
            <button
              id="preset-month"
              onClick={() => applyDatePreset('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeDatePreset === 'month'
                  ? 'bg-brand-secondary text-white shadow-xs'
                  : 'bg-surf-container text-text-secondary hover:text-text-primary'
              }`}
            >
              This Month (Sep 2026)
            </button>
            <button
              id="preset-30days"
              onClick={() => applyDatePreset('30days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeDatePreset === '30days'
                  ? 'bg-brand-secondary text-white shadow-xs'
                  : 'bg-surf-container text-text-secondary hover:text-text-primary'
              }`}
            >
              Last 30 Days
            </button>
            <button
              id="preset-today"
              onClick={() => applyDatePreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeDatePreset === 'today'
                  ? 'bg-brand-secondary text-white shadow-xs'
                  : 'bg-surf-container text-text-secondary hover:text-text-primary'
              }`}
            >
              Today
            </button>
          </div>

          {/* Custom Date Bounds Inputs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-surf-low border border-border-subtle rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-mono font-bold text-text-secondary">From:</span>
              <input 
                type="text"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="bg-transparent border-none outline-none font-mono text-text-primary text-xs w-36 sm:w-44"
                placeholder="2026-09-01T00:00:00"
                title="Start date ISO string"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-surf-low border border-border-subtle rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-mono font-bold text-text-secondary">To:</span>
              <input 
                type="text"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="bg-transparent border-none outline-none font-mono text-text-primary text-xs w-36 sm:w-44"
                placeholder="2026-09-30T23:59:59"
                title="End date ISO string"
              />
            </div>

            <button
              id="reports-apply-date-btn"
              onClick={() => fetchReports(false)}
              className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-semibold transition-colors active-scale cursor-pointer"
            >
              Apply Filter
            </button>
          </div>

        </div>

        {fetchError && (
          <div className="mt-3 pt-3 border-t border-border-subtle/70 flex items-center gap-2 text-xs text-amber-600">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{fetchError}</span>
          </div>
        )}
      </div>

      {/* SECTION 1: Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8" id="reports-sales-kpis">
        
        {/* KPI 1: Total Revenue (PKR/Currency formatted with Banknote/Wallet icon, no technical endpoint text) */}
        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-brand-secondary/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-secondary/10 text-brand-secondary flex items-center justify-center font-black text-xs font-mono">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-brand-primary tracking-tight">
              {formatPrice(salesSummary.totalRevenue)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] text-text-secondary">
              <span>Gross Sales:</span>
              <span className="font-mono font-bold text-brand-secondary">
                {salesSummary.totalOrders} {salesSummary.totalOrders === 1 ? 'Order' : 'Orders'} Billed
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-brand-primary/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-brand-primary tracking-tight">
              {salesSummary.totalOrders.toLocaleString()}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] text-text-secondary">
              <span>Avg Spend Per Order:</span>
              <span className="font-mono font-bold text-text-primary" title="Total Revenue divided by Total Orders">
                {formatPrice(avgOrderValue)}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Total Tax Collected */}
        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider">
              Total Tax Collected
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-brand-primary tracking-tight">
              {formatPrice(salesSummary.totalTax)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] text-text-secondary">
              <span>Tax Rate Share:</span>
              <span className="font-mono font-bold text-text-primary" title="Total Tax divided by Total Revenue">
                {taxPercentage.toFixed(1)}% of sales
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Net Sales */}
        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-brand-accent-green/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider">
              Net Sales (Excl. Tax)
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-accent-green/10 text-brand-accent-green flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-brand-primary tracking-tight">
              {formatPrice(netRevenue)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] text-text-secondary">
              <span>Restaurant Net Share:</span>
              <span className="font-mono font-bold text-brand-accent-green" title="Net Sales divided by Total Revenue">
                {salesSummary.totalRevenue > 0 ? `${((netRevenue / salesSummary.totalRevenue) * 100).toFixed(1)}%` : '100%'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2 & 3: Most Ordered Items & Revenue By Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8" id="reports-middle-grid">
        
        {/* Most Ordered Items */}
        <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col justify-between" id="reports-most-ordered-card">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-brand-secondary/10 rounded-lg text-brand-secondary">
                  <Award className="w-4 h-4" />
                </div>
                <h2 className="font-display font-bold text-lg text-brand-primary tracking-tight">
                  Top Best-Selling Dishes
                </h2>
              </div>

              {/* Limit Selector */}
              <div className="flex items-center gap-1 bg-surf-low border border-border-subtle rounded-lg p-0.5 text-[11px]">
                <span className="px-1.5 text-text-secondary font-mono font-semibold">Show Top:</span>
                {[3, 5, 10].map(lim => (
                  <button
                    key={lim}
                    onClick={() => setItemLimit(lim)}
                    className={`px-2 py-0.5 rounded-md font-mono font-bold transition-colors cursor-pointer ${
                      itemLimit === lim 
                        ? 'bg-brand-secondary text-white shadow-xs' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {lim}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-text-secondary text-xs mb-6 font-medium">
              Most popular menu items ranked by total quantity ordered
            </p>

            {/* Item Rankings List */}
            {mostOrdered.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-secondary">
                No item sales recorded for this period yet.
              </div>
            ) : (
              <div className="space-y-4">
                {mostOrdered.map((dish, idx) => {
                  const percentage = maxSoldQuantity > 0 ? (dish.totalQuantitySold / maxSoldQuantity) * 100 : 0;
                  const rankBadgeClass = idx === 0 
                    ? 'bg-amber-400 text-slate-900 border-amber-300' 
                    : idx === 1 
                    ? 'bg-slate-200 text-slate-800 border-slate-300' 
                    : idx === 2 
                    ? 'bg-amber-700/20 text-amber-800 border-amber-700/30' 
                    : 'bg-surf-container text-text-secondary border-border-subtle';

                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-black border ${rankBadgeClass} shrink-0`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-brand-primary truncate group-hover:text-brand-secondary transition-colors" title={dish.menuItemName}>
                            {dish.menuItemName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                          <span className="font-bold text-brand-primary">{dish.totalQuantitySold.toLocaleString()}</span>
                          <span className="text-[11px] text-text-secondary font-medium">orders</span>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full h-2 bg-surf-container rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0 
                              ? 'bg-brand-secondary' 
                              : idx === 1 
                              ? 'bg-brand-primary' 
                              : 'bg-brand-secondary/60'
                          }`}
                          style={{ width: `${Math.max(percentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border-subtle/80 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Aggregated from completed orders</span>
            <span className="font-mono text-brand-primary font-bold">
              Total Units: {mostOrdered.reduce((acc, curr) => acc + curr.totalQuantitySold, 0)}
            </span>
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs flex flex-col justify-between" id="reports-category-card">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="font-display font-bold text-lg text-brand-primary tracking-tight">
                  Revenue by Category
                </h2>
              </div>
              <span className="font-mono text-[11px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Distribution
              </span>
            </div>
            <p className="text-text-secondary text-xs mb-6 font-medium">
              Sales distribution across menu categories
            </p>

            {/* Category Bars & Cards */}
            {revenueByCategory.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-secondary">
                No category sales recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {revenueByCategory.map((cat, idx) => {
                  const percent = totalCategoryRevenueSum > 0 
                    ? (cat.totalRevenue / totalCategoryRevenueSum) * 100 
                    : 0;
                  const colorScheme = categoryColors[idx % categoryColors.length];

                  return (
                    <div key={idx} className="p-3 bg-surf-low border border-border-subtle rounded-xl hover:bg-white hover:border-brand-secondary/30 transition-all">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${colorScheme.bar}`} />
                          <span className="font-bold text-brand-primary font-sans">{cat.categoryName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] text-text-secondary font-semibold">
                            {percent.toFixed(1)}%
                          </span>
                          <span className="font-mono font-bold text-brand-primary">
                            {formatPrice(cat.totalRevenue)}
                          </span>
                        </div>
                      </div>

                      {/* Proportion Bar */}
                      <div className="w-full h-2 bg-surf-container rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${colorScheme.bar}`}
                          style={{ width: `${Math.max(percent, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border-subtle/80 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Total Categorized Revenue</span>
            <span className="font-mono text-brand-primary font-bold">
              {formatPrice(totalCategoryRevenueSum)}
            </span>
          </div>
        </div>

      </div>

      {/* SECTION 4: Peak Hours Analysis */}
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs mb-8" id="reports-peak-hours-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="font-display font-bold text-lg text-brand-primary tracking-tight">
                Peak Operating Hours
              </h2>
            </div>
            <p className="text-text-secondary text-xs mt-1 font-medium">
              Order volume distribution across 24 hours (00:00 to 23:00)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live active hover indicator badge */}
            {hoveredHour !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white rounded-xl text-xs font-semibold shadow-xs transition-all animate-fadeIn">
                <Clock className="w-3.5 h-3.5 text-brand-secondary" />
                <span>
                  {formatHourLabel(hoveredHour)}: <strong className="text-brand-secondary font-mono">
                    {peakHours.find(p => p.hourOfDay === hoveredHour)?.orderCount || 0}
                  </strong> orders
                </span>
              </div>
            )}

            {busiestHour && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-700 text-xs font-bold shrink-0">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Busiest Rush: {formatHourLabel(busiestHour.hourOfDay)} ({busiestHour.orderCount} orders)</span>
              </div>
            )}
          </div>
        </div>

        {/* 24-Hour Visual Bar Chart (with generous top padding so tooltips never clip) */}
        <div className="pt-10 pb-2 overflow-x-auto no-scrollbar">
          <div className="min-w-[640px]">
            {/* Chart Area */}
            <div className="h-48 flex items-end gap-2 sm:gap-3 px-2 border-b border-border-subtle pb-2">
              {Array.from({ length: 24 }).map((_, hour) => {
                const hourData = peakHours.find(p => p.hourOfDay === hour);
                const count = hourData ? hourData.orderCount : 0;
                const isPeak = busiestHour && count === busiestHour.orderCount && count > 0;
                const heightPercent = maxPeakOrderCount > 0 ? (count / maxPeakOrderCount) * 100 : 0;
                const isHovered = hoveredHour === hour;

                return (
                  <div 
                    key={hour} 
                    onMouseEnter={() => setHoveredHour(hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                    onClick={() => setHoveredHour(hour)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    {/* Clear, well-proportioned hover card above the bar */}
                    {isHovered && (
                      <div className="absolute -top-12 z-30 flex flex-col items-center pointer-events-none transition-all">
                        <div className="bg-slate-900 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap border border-slate-700 flex items-center gap-1.5">
                          <span className="font-bold text-amber-400">{formatHourLabel(hour)}</span>
                          <span className="text-slate-400">|</span>
                          <span className="font-bold font-mono">{count} {count === 1 ? 'order' : 'orders'}</span>
                        </div>
                        {/* Downward pointing arrow */}
                        <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700" />
                      </div>
                    )}

                    {/* Order count label above active bars */}
                    {count > 0 && (
                      <span className={`text-[10px] font-mono font-bold mb-1 transition-colors ${
                        isPeak ? 'text-amber-600 font-black' : isHovered ? 'text-brand-primary font-black' : 'text-text-secondary'
                      }`}>
                        {count}
                      </span>
                    )}

                    {/* Bar element */}
                    <div 
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        count === 0 
                          ? 'h-1 bg-surf-container hover:bg-slate-300' 
                          : isPeak 
                          ? 'bg-amber-500 hover:bg-amber-600 shadow-xs' 
                          : isHovered
                          ? 'bg-brand-primary shadow-xs'
                          : 'bg-brand-secondary hover:bg-brand-secondary/80'
                      }`}
                      style={{ height: count > 0 ? `${Math.max(heightPercent, 8)}%` : '4px' }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Hour Labels */}
            <div className="flex items-center gap-2 sm:gap-3 px-2 pt-2 text-[10px] font-mono text-text-secondary">
              {Array.from({ length: 24 }).map((_, hour) => {
                const showLabel = hour % 3 === 0 || hour === 23;
                const isHovered = hoveredHour === hour;
                return (
                  <div 
                    key={hour} 
                    className={`flex-1 text-center truncate transition-colors ${
                      isHovered ? 'text-brand-primary font-bold' : ''
                    }`}
                  >
                    {showLabel ? formatHourLabel(hour) : '·'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend & Insights */}
        <div className="mt-4 pt-4 border-t border-border-subtle/80 flex flex-wrap items-center justify-between gap-4 text-xs text-text-secondary">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="font-medium">Peak Rush Hour</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-brand-secondary" />
              <span className="font-medium">Regular Order Window</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-surf-container" />
              <span className="font-medium">No Orders</span>
            </div>
          </div>
          <span className="font-mono text-[11px] text-text-primary font-semibold">
            Maximum Volume: {busiestHour ? `${busiestHour.orderCount} orders in 1 hour` : '0 orders'}
          </span>
        </div>
      </div>

    </div>
  );
}

