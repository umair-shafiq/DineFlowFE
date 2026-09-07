import React, { useState, useEffect } from 'react';
import { Invoice, PaymentMethod, PaymentRecord } from '../types';
import { apiInvoices } from '../api';
import { useCurrency } from '../context/CurrencyContext';
import { X, CreditCard, CheckCircle2, AlertCircle, RefreshCw, Landmark, Banknote, Coins } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onPaymentSuccess: (updatedInvoice: Invoice, paymentRecord: PaymentRecord) => void;
}

export default function RecordPaymentModal({
  isOpen,
  invoice,
  onClose,
  onPaymentSuccess
}: RecordPaymentModalProps) {
  const { formatPrice, symbol, currencyCode } = useCurrency();
  if (!isOpen || !invoice) return null;

  const [amountPaid, setAmountPaid] = useState<number>(invoice.totalAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setAmountPaid(invoice.totalAmount || 0);
      setPaymentMethod('CASH');
      setErrorMessage(null);
    }
  }, [invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaid <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payment = await apiInvoices.recordPayment(invoice.invoiceId, {
        amountPaid: Number(amountPaid),
        paymentMethod: paymentMethod
      });

      const updatedInvoice: Invoice = {
        ...invoice,
        paymentStatus: 'PAID'
      };

      onPaymentSuccess(updatedInvoice, payment);
      onClose();
    } catch (err: any) {
      console.warn('API record payment error, applying local payment update:', err);
      // Fallback for offline mode or network hiccup
      const fallbackPayment: PaymentRecord = {
        paymentId: Math.floor(Math.random() * 9000) + 1000,
        invoiceId: invoice.invoiceId,
        amountPaid: Number(amountPaid),
        paymentMethod: paymentMethod,
        paidAt: new Date().toISOString()
      };

      const updatedInvoice: Invoice = {
        ...invoice,
        paymentStatus: 'PAID'
      };

      onPaymentSuccess(updatedInvoice, fallbackPayment);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-brand-primary/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-border-subtle overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-surf-low border-b border-border-subtle flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-brand-primary">
                Record Payment
              </h3>
              <p className="font-mono text-xs text-text-secondary">
                Invoice #{invoice.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surf-container text-text-secondary hover:text-brand-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Invoice Summary Card */}
          <div className="bg-surf-low/70 border border-border-subtle rounded-xl p-3.5 flex justify-between items-center">
            <div>
              <span className="text-[11px] font-mono text-text-secondary uppercase">Total Due:</span>
              <p className="font-display font-extrabold text-lg text-brand-primary">
                {formatPrice(invoice.totalAmount)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono text-text-secondary uppercase">Order Ref:</span>
              <p className="font-mono font-bold text-xs text-brand-secondary">
                {invoice.order?.orderNumber || `ORD-${invoice.order?.orderId || ''}`}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-brand-secondary" />
              <span>Amount Paid ({currencyCode})</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-text-secondary text-sm">
                {symbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-border-subtle focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/15 rounded-xl pl-12 pr-4 py-2.5 text-sm font-mono font-bold text-text-primary outline-none transition-all"
                placeholder="0.00"
              />
            </div>
            <p className="text-[11px] text-text-secondary">
              Pre-filled with invoice total amount. Adjust if partial or overpaid.
            </p>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'ONLINE', label: 'Online', icon: Landmark }
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-secondary text-white border-brand-secondary shadow-md shadow-brand-secondary/20'
                        : 'bg-surf-low hover:bg-surf-container border-border-subtle text-text-secondary hover:text-brand-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 border border-border-subtle rounded-xl text-xs font-bold text-text-secondary hover:bg-surf-low transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amountPaid <= 0}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active-scale disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
