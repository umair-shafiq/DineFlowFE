import React, { useState, useEffect } from 'react';
import { Invoice, PaymentRecord, UserRole } from '../types';
import { apiInvoices } from '../api';
import { 
  Receipt, 
  Search, 
  Filter, 
  CreditCard, 
  Printer, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  Calendar, 
  DollarSign, 
  ArrowUpDown,
  Utensils,
  Plus
} from 'lucide-react';
import ReceiptView from './ReceiptView';
import RecordPaymentModal from './RecordPaymentModal';

interface InvoicesViewProps {
  invoices: Invoice[];
  onInvoicesChange: (updatedInvoices: Invoice[]) => void;
  selectedInvoiceId?: number | string | null;
  onSelectInvoice?: (invoice: Invoice | null) => void;
  userRole?: UserRole;
}

export default function InvoicesView({
  invoices,
  onInvoicesChange,
  selectedInvoiceId,
  onSelectInvoice,
  userRole = 'ADMIN'
}: InvoicesViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'PAID' | 'UNPAID'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<Invoice | null>(() => {
    if (selectedInvoiceId) {
      return invoices.find(inv => String(inv.invoiceId) === String(selectedInvoiceId) || String(inv.id) === String(selectedInvoiceId)) || null;
    }
    return null;
  });
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync selectedInvoiceId if passed via props
  useEffect(() => {
    if (selectedInvoiceId) {
      const match = invoices.find(inv => String(inv.invoiceId) === String(selectedInvoiceId) || String(inv.id) === String(selectedInvoiceId));
      if (match) {
        setActiveReceiptInvoice(match);
      }
    }
  }, [selectedInvoiceId, invoices]);

  // Load from API on mount
  useEffect(() => {
    handleFetchInvoices();
  }, []);

  const handleFetchInvoices = async () => {
    setIsLoading(true);
    try {
      const list = await apiInvoices.list();
      if (Array.isArray(list)) {
        onInvoicesChange(list);
      }
    } catch (err) {
      console.warn('Failed to load invoices from API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvoiceUpdated = (updated: Invoice) => {
    const updatedList = invoices.map(inv => inv.invoiceId === updated.invoiceId ? updated : inv);
    onInvoicesChange(updatedList);
    setActiveReceiptInvoice(updated);
  };

  const handlePaymentSuccess = (updatedInvoice: Invoice, paymentRecord: PaymentRecord) => {
    const updatedList = invoices.map(inv => inv.invoiceId === updatedInvoice.invoiceId ? updatedInvoice : inv);
    onInvoicesChange(updatedList);
    if (activeReceiptInvoice && activeReceiptInvoice.invoiceId === updatedInvoice.invoiceId) {
      setActiveReceiptInvoice(updatedInvoice);
    }
  };

  // Metrics calculation
  const totalInvoicesCount = invoices.length;
  const totalInvoicedAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const paidInvoices = invoices.filter(inv => inv.paymentStatus.toUpperCase() === 'PAID');
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const unpaidInvoices = invoices.filter(inv => inv.paymentStatus.toUpperCase() !== 'PAID');
  const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  // Filtering
  const filteredInvoices = invoices.filter((inv) => {
    const statusMatch = activeTab === 'all' 
      ? true 
      : activeTab === 'PAID' 
        ? inv.paymentStatus.toUpperCase() === 'PAID'
        : inv.paymentStatus.toUpperCase() !== 'PAID';

    if (!statusMatch) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const invNum = String(inv.invoiceNumber || '').toLowerCase();
    const orderNum = String(inv.order?.orderNumber || `ord-${inv.order?.orderId || ''}`).toLowerCase();
    const tableNum = String(inv.order?.restaurantTable?.tableNumber || '').toLowerCase();
    const idStr = String(inv.invoiceId || inv.id || '');

    return invNum.includes(query) || orderNum.includes(query) || tableNum.includes(query) || idStr.includes(query);
  });

  // If receipt view is opened
  if (activeReceiptInvoice) {
    return (
      <ReceiptView
        invoice={activeReceiptInvoice}
        onBack={() => {
          setActiveReceiptInvoice(null);
          if (onSelectInvoice) onSelectInvoice(null);
        }}
        onInvoiceUpdated={handleInvoiceUpdated}
      />
    );
  }

  return (
    <div className="px-6 sm:px-10 py-6" id="invoices-view">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-semibold text-[32px] text-brand-primary leading-tight mb-1">
            Invoices & Billing
          </h1>
          <p className="text-text-secondary text-sm font-medium">
            Manage customer bills, track paid/unpaid status, and generate 80mm thermal receipts.
          </p>
        </div>

        <button
          onClick={handleFetchInvoices}
          disabled={isLoading}
          className="px-4 py-2 bg-white border border-border-subtle rounded-xl text-xs font-bold text-text-primary hover:bg-surf-low flex items-center gap-2 shadow-xs transition-all active-scale cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-secondary ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Invoices</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Total Bills</span>
            <Receipt className="w-4 h-4 text-brand-secondary" />
          </div>
          <p className="font-display font-bold text-2xl text-brand-primary">
            {totalInvoicesCount}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Total invoices generated
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Total Invoiced</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-display font-bold text-2xl text-brand-primary">
            ${totalInvoicedAmount.toFixed(2)}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Gross revenue generated
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Collected (Paid)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-display font-bold text-2xl text-emerald-700">
            ${paidAmount.toFixed(2)}
          </p>
          <p className="text-[11px] text-emerald-800 mt-0.5">
            {paidInvoices.length} orders settled
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Pending (Unpaid)</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-display font-bold text-2xl text-amber-800">
            ${unpaidAmount.toFixed(2)}
          </p>
          <p className="text-[11px] text-amber-900 mt-0.5">
            {unpaidInvoices.length} invoices awaiting payment
          </p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Payment Status Tabs */}
          <div className="flex bg-surf-container p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-brand-primary shadow-xs'
                  : 'text-text-secondary hover:text-brand-primary'
              }`}
            >
              All Invoices ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('PAID')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'PAID'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-text-secondary hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paid ({paidInvoices.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('UNPAID')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'UNPAID'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-text-secondary hover:text-amber-800'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Unpaid ({unpaidInvoices.length})</span>
            </button>
          </div>

          {/* Search Query */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, ticket, table..."
              className="w-full bg-surf-low border border-border-subtle rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-brand-secondary outline-none text-text-primary"
            />
          </div>

        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white border border-border-subtle rounded-2xl shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Receipt className="w-12 h-12 text-text-secondary/30 mx-auto" />
            <h3 className="font-display font-bold text-base text-brand-primary">
              No Invoices Found
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              {searchQuery 
                ? `No invoices matched query "${searchQuery}".` 
                : 'No invoices have been generated yet. Open an active order on the Orders board and click "Generate Bill".'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surf-low/60 border-b border-border-subtle text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Order Reference</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 text-xs font-sans">
                {filteredInvoices.map((inv) => {
                  const isPaid = inv.paymentStatus.toUpperCase() === 'PAID';
                  const orderRef = inv.order?.orderNumber || `ORD-${inv.order?.orderId || ''}`;
                  const tableRef = inv.order?.restaurantTable?.tableNumber;

                  return (
                    <tr 
                      key={inv.invoiceId}
                      className="hover:bg-surf-low/40 transition-colors group cursor-pointer"
                      onClick={() => setActiveReceiptInvoice(inv)}
                    >
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-primary">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-brand-secondary shrink-0" />
                          <span>{inv.invoiceNumber}</span>
                        </div>
                      </td>

                      {/* Order Ref */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-brand-primary">
                            {orderRef}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                            <span className="font-mono uppercase font-semibold text-brand-secondary">
                              {inv.order?.orderType || 'DINE_IN'}
                            </span>
                            {tableRef && <span>• Table {tableRef}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-text-secondary font-mono text-[11px]">
                        {new Date(inv.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-brand-primary">
                        ${inv.totalAmount.toFixed(2)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            UNPAID
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          
                          <button
                            onClick={() => setActiveReceiptInvoice(inv)}
                            className="px-3 py-1.5 bg-surf-low hover:bg-surf-container border border-border-subtle text-text-primary rounded-lg font-bold text-xs flex items-center gap-1 transition-colors active-scale"
                            title="View Receipt"
                          >
                            <Eye className="w-3.5 h-3.5 text-brand-secondary" />
                            <span>Receipt</span>
                          </button>

                          {!isPaid ? (
                            <button
                              onClick={() => setActivePaymentInvoice(inv)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs active-scale transition-colors cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Record Payment</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveReceiptInvoice(inv);
                                setTimeout(() => window.print(), 200);
                              }}
                              className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs active-scale transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={!!activePaymentInvoice}
        invoice={activePaymentInvoice}
        onClose={() => setActivePaymentInvoice(null)}
        onPaymentSuccess={handlePaymentSuccess}
      />

    </div>
  );
}
