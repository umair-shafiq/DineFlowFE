import React, { useState, useEffect } from 'react';
import { Invoice, PaymentRecord } from '../types';
import { apiInvoices } from '../api';
import { useCurrency } from '../context/CurrencyContext';
import { 
  Printer, 
  CreditCard, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Receipt, 
  Clock, 
  Utensils, 
  Hash, 
  ShieldCheck,
  RefreshCw,
  Sparkles,
  DollarSign
} from 'lucide-react';
import RecordPaymentModal from './RecordPaymentModal';

interface ReceiptViewProps {
  invoice: Invoice;
  onBack?: () => void;
  onInvoiceUpdated?: (updatedInvoice: Invoice) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export default function ReceiptView({
  invoice: initialInvoice,
  onBack,
  onInvoiceUpdated,
  onClose,
  isModal = false
}: ReceiptViewProps) {
  const { formatPrice, currencyCode, symbol } = useCurrency();
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync when prop updates
  useEffect(() => {
    setInvoice(initialInvoice);
  }, [initialInvoice]);

  // Load payment record if invoice is PAID
  useEffect(() => {
    if (invoice.paymentStatus.toUpperCase() === 'PAID') {
      loadPaymentDetails();
    }
  }, [invoice.invoiceId, invoice.paymentStatus]);

  const loadPaymentDetails = async () => {
    setIsLoadingPayment(true);
    try {
      const payment = await apiInvoices.getPayment(invoice.invoiceId);
      if (payment && payment.amountPaid) {
        setPaymentRecord(payment);
      }
    } catch (e) {
      // payment info might not have a separate record yet
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const handleRefreshInvoice = async () => {
    setIsRefreshing(true);
    try {
      const latest = await apiInvoices.getById(invoice.invoiceId);
      if (latest && latest.invoiceNumber) {
        setInvoice(latest);
        if (onInvoiceUpdated) onInvoiceUpdated(latest);
      }
    } catch (e) {
      console.warn('Could not refresh invoice from API:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePaymentSuccess = (updatedInvoice: Invoice, payment: PaymentRecord) => {
    setInvoice(updatedInvoice);
    setPaymentRecord(payment);
    if (onInvoiceUpdated) {
      onInvoiceUpdated(updatedInvoice);
    }
  };

  const isPaid = invoice.paymentStatus.toUpperCase() === 'PAID';
  const orderItems = invoice.order?.orderItems || [];

  // Format date helper
  const formattedDate = () => {
    try {
      const d = new Date(invoice.createdAt);
      if (isNaN(d.getTime())) return invoice.createdAt;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return invoice.createdAt;
    }
  };

  const receiptContent = (
    <div className="flex flex-col items-center">
      {/* 80mm Thermal Receipt Styled Container */}
      <div 
        id="thermal-receipt-container"
        className="printable-receipt w-full max-w-[350px] bg-white text-neutral-900 font-mono text-xs p-6 shadow-md rounded-2xl border border-neutral-200 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-full"
      >
        {/* Restaurant Header */}
        <div className="text-center space-y-1 pb-4 border-b border-dashed border-neutral-300">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Utensils className="w-4 h-4 text-neutral-800" />
            <h2 className="font-display font-extrabold text-lg tracking-tight text-neutral-900 uppercase">
              DineFlow Restaurant
            </h2>
          </div>
          <p className="text-[10px] text-neutral-500 font-sans tracking-wide">
            Fine Dining & Artisan Bistro
          </p>
          <p className="text-[9px] text-neutral-400 font-sans">
            742 Evergreen Terrace, Suite 100 • Tel: (555) 019-2834
          </p>
        </div>

        {/* Invoice & Order Metadata */}
        <div className="py-3.5 space-y-1 border-b border-dashed border-neutral-300 text-[11px]">
          <div className="flex justify-between items-center font-bold">
            <span className="text-neutral-500">INVOICE:</span>
            <span className="text-neutral-900 font-mono">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-500">ORDER TICKET:</span>
            <span className="text-neutral-800 font-bold">
              {invoice.order?.orderNumber || `ORD-${invoice.order?.orderId || ''}`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-500">DINING TYPE:</span>
            <span className="font-bold uppercase text-neutral-800">
              {invoice.order?.orderType || 'DINE_IN'}
            </span>
          </div>
          {invoice.order?.restaurantTable && (
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">TABLE:</span>
              <span className="font-bold text-neutral-900">
                {invoice.order.restaurantTable.tableNumber}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-neutral-500">DATE & TIME:</span>
            <span className="text-neutral-700">{formattedDate()}</span>
          </div>
        </div>

        {/* Itemized Products List */}
        <div className="py-3.5 border-b border-dashed border-neutral-300">
          <div className="grid grid-cols-12 text-[10px] font-bold text-neutral-400 uppercase tracking-wider pb-2">
            <span className="col-span-6">Item</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Price</span>
            <span className="col-span-2 text-right">Total</span>
          </div>

          <div className="space-y-2">
            {orderItems.length > 0 ? (
              orderItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px] items-start">
                  <div className="col-span-6 pr-1">
                    <p className="font-bold text-neutral-900 leading-tight">
                      {item.menuItem?.name || 'Dish Item'}
                    </p>
                    {item.menuItem?.category?.name && (
                      <span className="text-[9px] text-neutral-400 block">
                        {item.menuItem.category.name}
                      </span>
                    )}
                  </div>
                  <span className="col-span-2 text-center font-bold text-neutral-700">
                    {item.quantity}
                  </span>
                  <span className="col-span-2 text-right text-neutral-500">
                    {formatPrice(item.unitPrice)}
                  </span>
                  <span className="col-span-2 text-right font-bold text-neutral-900">
                    {formatPrice(item.subtotal)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-2 text-neutral-400 text-[10px] italic">
                Items consolidated on order #{invoice.order?.orderNumber || invoice.order?.orderId}
              </div>
            )}
          </div>
        </div>

        {/* Financial Calculation */}
        <div className="py-3.5 space-y-1.5 border-b border-dashed border-neutral-300 text-[11px]">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal:</span>
            <span className="font-bold font-mono">{formatPrice(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Tax Amount (15%):</span>
            <span className="font-bold font-mono">{formatPrice(invoice.taxAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-extrabold text-neutral-900 pt-2 border-t border-neutral-200">
            <span>TOTAL DUE:</span>
            <span className="text-base font-mono">{formatPrice(invoice.totalAmount)}</span>
          </div>
        </div>

        {/* Payment Status & Details */}
        <div className="py-3.5 space-y-2 border-b border-dashed border-neutral-300 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 font-bold uppercase">Payment Status:</span>
            {isPaid ? (
              <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase print:border-black print:text-black print:bg-transparent">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 print:hidden" />
                PAID
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase print:border-black print:text-black print:bg-transparent">
                <AlertCircle className="w-3 h-3 text-amber-700 print:hidden" />
                UNPAID
              </span>
            )}
          </div>

          {isPaid && (
            <div className="bg-neutral-50 rounded-lg p-2.5 space-y-1 text-[10px] border border-neutral-200/70 font-sans print:border-none print:bg-transparent print:p-0">
              <div className="flex justify-between">
                <span className="text-neutral-500">Method:</span>
                <span className="font-bold font-mono text-neutral-800">
                  {paymentRecord?.paymentMethod || 'CASH'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Amount Paid:</span>
                <span className="font-bold font-mono text-neutral-800">
                  {formatPrice(paymentRecord?.amountPaid || invoice.totalAmount)}
                </span>
              </div>
              {paymentRecord?.paidAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Paid At:</span>
                  <span className="text-neutral-700">
                    {new Date(paymentRecord.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-4 text-center space-y-1">
          <p className="font-bold text-[11px] text-neutral-800">
            THANK YOU FOR DINING WITH US!
          </p>
          <p className="text-[9px] text-neutral-400 font-sans">
            Please retain this thermal invoice receipt for your records.
          </p>
          <div className="pt-2 flex justify-center">
            <div className="h-6 w-44 bg-neutral-900 opacity-80 rounded-xs flex items-center justify-around px-2 text-[8px] text-white font-mono tracking-widest print:opacity-100">
              ||| | |||| || | |||| |||
            </div>
          </div>
        </div>

      </div>

      {/* Screen Action Toolbar (Hidden when printing) */}
      <div className="no-print mt-6 flex flex-wrap items-center justify-center gap-3 w-full max-w-[350px]">
        {!isPaid ? (
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active-scale transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        ) : (
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 active-scale transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        )}

        <button
          onClick={handleRefreshInvoice}
          disabled={isRefreshing}
          title="Refresh from server"
          className="p-3 bg-white hover:bg-surf-low text-text-secondary border border-border-subtle rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {onBack && (
          <button
            onClick={onBack}
            className="py-3 px-4 bg-surf-low hover:bg-surf-container text-text-primary border border-border-subtle rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-xs transition-colors"
          >
            Close Receipt View
          </button>
        )}
      </div>

      {/* Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        invoice={invoice}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-primary/60 backdrop-blur-xs overflow-y-auto no-print">
        <div className="relative my-8">
          {receiptContent}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 sm:px-10 py-6 max-w-4xl mx-auto" id="receipt-full-view">
      {/* Top Breadcrumb Navigation */}
      <div className="no-print flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-white border border-border-subtle rounded-xl hover:bg-surf-low text-text-secondary hover:text-brand-primary transition-all active-scale"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="font-display font-semibold text-2xl text-brand-primary leading-tight">
              Customer Invoice & Receipt
            </h1>
            <p className="text-xs text-text-secondary">
              80mm Thermal Receipt Preview & Payment Terminal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPaid && (
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-brand-primary/90 transition-all shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          )}
        </div>
      </div>

      {/* Thermal Receipt Body */}
      {receiptContent}
    </div>
  );
}
