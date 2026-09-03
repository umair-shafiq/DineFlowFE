import React, { useState, useEffect, useMemo } from 'react';
import { Reservation, ReservationStatus, RestaurantTable, UserRole } from '../types';
import { 
  CalendarClock, 
  Plus, 
  Search, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Users, 
  Phone, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Trash2, 
  Edit3, 
  Eye, 
  Check, 
  Ban, 
  AlertTriangle, 
  Filter, 
  LayoutGrid, 
  List,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { apiReservations, apiTables } from '../api';

interface ReservationsViewProps {
  reservations: Reservation[];
  tables: RestaurantTable[];
  onReservationsChange: (reservations: Reservation[]) => void;
  onTablesChange?: (tables: RestaurantTable[]) => void;
  userRole?: UserRole;
}

const RESERVATION_DURATION_HOURS = 2;

export default function ReservationsView({
  reservations = [],
  tables = [],
  onReservationsChange,
  onTablesChange,
  userRole = 'ADMIN'
}: ReservationsViewProps) {
  // Navigation & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReservationStatus>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'UPCOMING'>('ALL');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected reservation for edit/view/delete
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);

  // Form inputs state
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formGuests, setFormGuests] = useState<number>(2);
  const [formTableId, setFormTableId] = useState<number | undefined>(undefined);
  const [formDateTime, setFormDateTime] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Helper to format ISO to datetime-local value
  const toDateTimeLocal = (dateStr?: string) => {
    if (!dateStr) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      now.setSeconds(0, 0);
      const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
      return iso.slice(0, 16);
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.slice(0, 16);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
      return iso.slice(0, 16);
    } catch {
      return dateStr.slice(0, 16);
    }
  };

  // Helper to format date nicely
  const formatReservationTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  // Helper for 2-hour window display
  const formatTimeSlot = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const start = new Date(dateStr);
      if (isNaN(start.getTime())) return '';
      const end = new Date(start.getTime() + RESERVATION_DURATION_HOURS * 60 * 60 * 1000);
      const startFormatted = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const endFormatted = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${startFormatted} – ${endFormatted}`;
    } catch {
      return '';
    }
  };

  // Fetch live reservations on mount & on refresh
  const fetchLiveReservations = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [liveReservations, liveTables] = await Promise.allSettled([
        apiReservations.list(),
        apiTables.list()
      ]);

      if (liveReservations.status === 'fulfilled' && Array.isArray(liveReservations.value)) {
        onReservationsChange(liveReservations.value);
      }
      if (liveTables.status === 'fulfilled' && Array.isArray(liveTables.value) && onTablesChange) {
        onTablesChange(liveTables.value);
      }
      if (!silent) {
        showToast('Reservations refreshed from server.', 'info');
      }
    } catch (err: any) {
      if (!silent) {
        showToast(err.message || 'Failed to refresh reservations.', 'error');
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveReservations(true);
  }, []);

  // 2-Hour Conflict Pre-validation Check
  const checkConflicts = (tableId?: number, dateTimeStr?: string, excludeResId?: number): { hasConflict: boolean; conflictingRes?: Reservation } => {
    if (!tableId || !dateTimeStr) return { hasConflict: false };
    try {
      const targetTime = new Date(dateTimeStr).getTime();
      if (isNaN(targetTime)) return { hasConflict: false };
      const windowMs = RESERVATION_DURATION_HOURS * 60 * 60 * 1000;

      const conflictingRes = reservations.find(r => {
        if (excludeResId && r.reservationId === excludeResId) return false;
        if (r.status === 'CANCELLED' || r.status === 'COMPLETED') return false;
        const assignedTableId = r.restaurantTableId || r.restaurantTable?.restaurantTableId;
        if (Number(assignedTableId) !== Number(tableId)) return false;

        const rTime = new Date(r.reservationDateTime).getTime();
        if (isNaN(rTime)) return false;

        // Check if within +/- 2 hours window
        return Math.abs(targetTime - rTime) < windowMs;
      });

      return {
        hasConflict: !!conflictingRes,
        conflictingRes
      };
    } catch {
      return { hasConflict: false };
    }
  };

  // Update conflict warning when form fields change
  useEffect(() => {
    if (isAddModalOpen || isEditModalOpen) {
      if (formTableId && formDateTime) {
        const { hasConflict, conflictingRes } = checkConflicts(
          formTableId, 
          formDateTime, 
          activeReservation ? activeReservation.reservationId : undefined
        );
        if (hasConflict && conflictingRes) {
          const formatted = formatReservationTime(conflictingRes.reservationDateTime);
          setFormWarning(
            `Table ${conflictingRes.restaurantTable?.tableNumber || `T-${formTableId}`} already has an active reservation for ${conflictingRes.customerName} at ${formatted} (2-hour overlap).`
          );
        } else {
          setFormWarning(null);
        }
      } else {
        setFormWarning(null);
      }
    }
  }, [formTableId, formDateTime, isAddModalOpen, isEditModalOpen, activeReservation]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormGuests(2);
    setFormTableId(tables[0]?.restaurantTableId);
    setFormDateTime(toDateTimeLocal());
    setFormError(null);
    setFormWarning(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (res: Reservation) => {
    setActiveReservation(res);
    setFormCustomerName(res.customerName || '');
    setFormCustomerPhone(res.customerPhone || '');
    setFormGuests(res.numberOfGuests || 2);
    setFormTableId(res.restaurantTableId || res.restaurantTable?.restaurantTableId || tables[0]?.restaurantTableId);
    setFormDateTime(toDateTimeLocal(res.reservationDateTime));
    setFormError(null);
    setFormWarning(null);
    setIsEditModalOpen(true);
  };

  // Open View Details Modal
  const handleOpenDetailsModal = (res: Reservation) => {
    setActiveReservation(res);
    setIsDetailsModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (res: Reservation) => {
    setActiveReservation(res);
    setIsDeleteModalOpen(true);
  };

  // Handle Create Reservation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerName.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!formCustomerPhone.trim()) {
      setFormError('Customer phone number is required.');
      return;
    }
    if (!formTableId) {
      setFormError('Please select a dining table.');
      return;
    }
    if (!formDateTime) {
      setFormError('Please choose reservation date & time.');
      return;
    }

    const selectedTable = tables.find(t => t.restaurantTableId === Number(formTableId));

    // Format ISO string format without timezone drift: YYYY-MM-DDTHH:mm:ss
    const formattedIso = formDateTime.length === 16 ? `${formDateTime}:00` : formDateTime;

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      restaurantTableId: Number(formTableId),
      customerName: formCustomerName.trim(),
      customerPhone: formCustomerPhone.trim(),
      numberOfGuests: Number(formGuests),
      reservationDateTime: formattedIso
    };

    try {
      let created: Reservation;
      try {
        created = await apiReservations.create(payload);
      } catch (apiErr: any) {
        // Capture backend 2-hour conflict error or resource not found error
        const msg = apiErr.message || 'Failed to create reservation.';
        setFormError(msg);
        setIsSubmitting(false);
        return;
      }

      // If backend succeeded, ensure local state is updated
      if (!created.restaurantTable && selectedTable) {
        created.restaurantTable = selectedTable;
      }
      onReservationsChange([created, ...reservations]);
      setIsAddModalOpen(false);
      showToast(`Reservation created for ${created.customerName} at Table ${created.restaurantTable?.tableNumber || formTableId}.`);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Reservation
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReservation) return;

    if (!formCustomerName.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!formCustomerPhone.trim()) {
      setFormError('Customer phone number is required.');
      return;
    }
    if (!formTableId) {
      setFormError('Please select a dining table.');
      return;
    }
    if (!formDateTime) {
      setFormError('Please choose reservation date & time.');
      return;
    }

    const selectedTable = tables.find(t => t.restaurantTableId === Number(formTableId));
    const formattedIso = formDateTime.length === 16 ? `${formDateTime}:00` : formDateTime;

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      restaurantTableId: Number(formTableId),
      customerName: formCustomerName.trim(),
      customerPhone: formCustomerPhone.trim(),
      numberOfGuests: Number(formGuests),
      reservationDateTime: formattedIso
    };

    try {
      let updated: Reservation;
      try {
        updated = await apiReservations.update(activeReservation.reservationId, payload);
      } catch (apiErr: any) {
        setFormError(apiErr.message || 'Failed to update reservation.');
        setIsSubmitting(false);
        return;
      }

      if (!updated.restaurantTable && selectedTable) {
        updated.restaurantTable = selectedTable;
      }

      const updatedList = reservations.map(r => 
        r.reservationId === activeReservation.reservationId ? updated : r
      );
      onReservationsChange(updatedList);
      setIsEditModalOpen(false);
      showToast(`Reservation #${activeReservation.reservationId} updated successfully.`);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Status Change
  const handleStatusChange = async (res: Reservation, newStatus: ReservationStatus) => {
    try {
      // Optimistic update
      const updatedList = reservations.map(r => 
        r.reservationId === res.reservationId ? { ...r, status: newStatus } : r
      );
      onReservationsChange(updatedList);

      if (activeReservation?.reservationId === res.reservationId) {
        setActiveReservation(prev => prev ? { ...prev, status: newStatus } : null);
      }

      await apiReservations.updateStatus(res.reservationId, newStatus);
      showToast(`Reservation #${res.reservationId} status updated to ${newStatus}.`);
    } catch (err: any) {
      showToast(err.message || `Failed to update status.`, 'error');
      // Revert if error
      fetchLiveReservations(true);
    }
  };

  // Handle Delete Reservation
  const handleDeleteConfirm = async () => {
    if (!activeReservation) return;
    setIsSubmitting(true);
    try {
      await apiReservations.delete(activeReservation.reservationId);
      const updatedList = reservations.filter(r => r.reservationId !== activeReservation.reservationId);
      onReservationsChange(updatedList);
      setIsDeleteModalOpen(false);
      showToast(`Reservation #${activeReservation.reservationId} deleted successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete reservation.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered reservations calculation
  const filteredReservations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    return reservations.filter(r => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = r.customerName?.toLowerCase().includes(q);
        const matchPhone = r.customerPhone?.toLowerCase().includes(q);
        const matchTable = (r.restaurantTable?.tableNumber || `t-${r.restaurantTableId}`).toLowerCase().includes(q);
        const matchId = String(r.reservationId).includes(q);
        if (!matchName && !matchPhone && !matchTable && !matchId) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      // 3. Table Filter
      if (tableFilter !== 'ALL') {
        const tableId = r.restaurantTableId || r.restaurantTable?.restaurantTableId;
        if (String(tableId) !== tableFilter) return false;
      }

      // 4. Date Filter
      if (dateFilter !== 'ALL' && r.reservationDateTime) {
        const resDate = new Date(r.reservationDateTime);
        if (!isNaN(resDate.getTime())) {
          const resDay = new Date(resDate);
          resDay.setHours(0, 0, 0, 0);

          if (dateFilter === 'TODAY') {
            if (resDay.getTime() !== today.getTime()) return false;
          } else if (dateFilter === 'TOMORROW') {
            if (resDay.getTime() !== tomorrow.getTime()) return false;
          } else if (dateFilter === 'UPCOMING') {
            if (resDate.getTime() < new Date().getTime()) return false;
          }
        }
      }

      return true;
    });
  }, [reservations, searchQuery, statusFilter, dateFilter, tableFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const total = reservations.length;
    const confirmed = reservations.filter(r => r.status === 'CONFIRMED').length;
    const pending = reservations.filter(r => r.status === 'PENDING').length;
    const completed = reservations.filter(r => r.status === 'COMPLETED').length;

    const todayBookings = reservations.filter(r => {
      if (!r.reservationDateTime) return false;
      const d = new Date(r.reservationDateTime);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;

    return { total, confirmed, pending, completed, todayBookings };
  }, [reservations]);

  // Helper for Status Badge Component
  const renderStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Confirmed</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Pending</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>Completed</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
            <Ban className="w-3 h-3 text-neutral-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in" id="reservations-view">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-slide-up ${
            notification.type === 'success' 
              ? 'bg-emerald-900 text-white border-emerald-700 shadow-emerald-900/20' 
              : notification.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700 shadow-rose-900/20'
              : 'bg-brand-primary text-white border-slate-700 shadow-slate-900/20'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          {notification.type === 'info' && <Info className="w-5 h-5 text-amber-400 shrink-0" />}
          <span className="text-xs font-medium">{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border-subtle shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20 flex items-center justify-center text-brand-secondary">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl text-brand-primary tracking-tight">
                Table Reservations
              </h1>
              <p className="font-sans text-xs text-text-secondary">
                Manage guest bookings, seating schedules, and 2-hour dining windows.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLiveReservations(false)}
            disabled={isRefreshing}
            className="h-10 px-4 rounded-xl border border-border-subtle bg-white hover:bg-surf-low text-text-primary text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Fetch live reservations from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-text-secondary ${isRefreshing ? 'animate-spin text-brand-secondary' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="h-10 px-5 rounded-xl bg-brand-secondary hover:bg-brand-secondary-hover text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-brand-secondary/15 cursor-pointer active-scale"
          >
            <Plus className="w-4 h-4" />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider font-mono">Today's Bookings</span>
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display font-black text-2xl text-brand-primary">{metrics.todayBookings}</span>
            <span className="text-[11px] text-text-secondary">scheduled today</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider font-mono">Confirmed</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display font-black text-2xl text-emerald-700">{metrics.confirmed}</span>
            <span className="text-[11px] text-emerald-600 font-medium">ready to host</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider font-mono">Pending</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display font-black text-2xl text-amber-700">{metrics.pending}</span>
            <span className="text-[11px] text-amber-600 font-medium">needs confirmation</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider font-mono">Completed</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display font-black text-2xl text-blue-700">{metrics.completed}</span>
            <span className="text-[11px] text-text-secondary">served guests</span>
          </div>
        </div>
      </div>

      {/* 2-Hour Booking Rule Policy Banner */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
          <Clock className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">2-Hour Dining Window Policy:</span> DineFlow reserves each table for a <strong>2-hour slot</strong>. The system automatically verifies schedule availability and prevents overlapping bookings on the same table within $\pm 2$ hours of requested time.
        </div>
      </div>

      {/* Search, Filters, and Layout Toggle */}
      <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone number, table number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-surf-low border border-border-subtle rounded-lg text-xs focus:ring-1 focus:ring-brand-secondary outline-none font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Table Selector Filter */}
          <div className="flex items-center gap-2">
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="bg-surf-low border border-border-subtle rounded-lg px-3 py-2 text-xs font-medium text-text-primary outline-none focus:ring-1 focus:ring-brand-secondary"
            >
              <option value="ALL">All Tables</option>
              {tables.map(t => (
                <option key={t.restaurantTableId} value={String(t.restaurantTableId)}>
                  {t.tableNumber} ({t.capacity} seats)
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-surf-low border border-border-subtle rounded-lg px-3 py-2 text-xs font-medium text-text-primary outline-none focus:ring-1 focus:ring-brand-secondary"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="TOMORROW">Tomorrow</option>
              <option value="UPCOMING">Upcoming Only</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-surf-low border border-border-subtle rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-brand-primary shadow-xs font-bold' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-brand-primary shadow-xs font-bold' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-border-subtle/50">
          {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((status) => {
            const count = status === 'ALL' 
              ? reservations.length 
              : reservations.filter(r => r.status === status).length;
            const isSelected = statusFilter === status;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isSelected 
                    ? 'bg-brand-primary text-white shadow-xs' 
                    : 'bg-surf-low text-text-secondary hover:text-text-primary hover:bg-surf-container'
                }`}
              >
                <span>{status === 'ALL' ? 'All Bookings' : status.charAt(0) + status.slice(1).toLowerCase()}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white text-text-secondary'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reservations Display */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-border-subtle p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surf-low flex items-center justify-center text-text-secondary mx-auto mb-3">
            <CalendarClock className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-base text-brand-primary">No Reservations Found</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto mt-1 mb-4">
            {searchQuery || statusFilter !== 'ALL' || dateFilter !== 'ALL' || tableFilter !== 'ALL'
              ? 'No reservations match your current filter criteria. Try clearing search filters.'
              : 'There are currently no table reservations on record. Click below to add the first reservation.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-secondary text-white text-xs font-bold hover:bg-brand-secondary-hover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Reservation</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* List Table View */
        <div className="bg-white rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surf-low/60 border-b border-border-subtle font-mono text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4"># ID</th>
                  <th className="py-3 px-4">Guest Information</th>
                  <th className="py-3 px-4">Table & Party</th>
                  <th className="py-3 px-4">Reservation Time</th>
                  <th className="py-3 px-4">2-Hour Slot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-xs">
                {filteredReservations.map((res) => {
                  const tableObj = res.restaurantTable || tables.find(t => t.restaurantTableId === res.restaurantTableId);
                  const tableLabel = tableObj ? tableObj.tableNumber : (res.restaurantTableId ? `T-${res.restaurantTableId}` : 'Unassigned');

                  return (
                    <tr key={res.reservationId} className="hover:bg-surf-low/40 transition-colors">
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-text-secondary">
                        #{res.reservationId}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-brand-primary">{res.customerName}</div>
                        <div className="text-text-secondary flex items-center gap-1.5 mt-0.5 text-[11px]">
                          <Phone className="w-3 h-3 text-text-secondary/70" />
                          <span>{res.customerPhone}</span>
                        </div>
                      </td>

                      {/* Table & Guests */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-brand-primary flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-surf-container font-mono text-[11px] text-brand-primary border border-border-subtle">
                            {tableLabel}
                          </span>
                        </div>
                        <div className="text-text-secondary flex items-center gap-1 mt-1 text-[11px]">
                          <Users className="w-3 h-3" />
                          <span>{res.numberOfGuests} Guests {tableObj ? `(Cap: ${tableObj.capacity})` : ''}</span>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-brand-primary">
                          {formatReservationTime(res.reservationDateTime)}
                        </div>
                      </td>

                      {/* 2-Hour Slot */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-800 bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          {formatTimeSlot(res.reservationDateTime)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(res.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Status actions */}
                          {res.status === 'PENDING' && (
                            <button
                              onClick={() => handleStatusChange(res, 'CONFIRMED')}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                              title="Confirm Reservation"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {res.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleStatusChange(res, 'COMPLETED')}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                              title="Mark as Completed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(res.status === 'PENDING' || res.status === 'CONFIRMED') && (
                            <button
                              onClick={() => handleStatusChange(res, 'CANCELLED')}
                              className="p-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200 transition-colors"
                              title="Cancel Reservation"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenDetailsModal(res)}
                            className="p-1.5 rounded-lg hover:bg-surf-container text-text-secondary hover:text-text-primary transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(res)}
                            className="p-1.5 rounded-lg hover:bg-surf-container text-text-secondary hover:text-text-primary transition-colors"
                            title="Edit Reservation"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenDeleteModal(res)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-text-secondary hover:text-rose-600 transition-colors"
                            title="Delete Reservation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReservations.map((res) => {
            const tableObj = res.restaurantTable || tables.find(t => t.restaurantTableId === res.restaurantTableId);
            const tableLabel = tableObj ? tableObj.tableNumber : (res.restaurantTableId ? `T-${res.restaurantTableId}` : 'Unassigned');

            return (
              <div 
                key={res.reservationId} 
                className="bg-white rounded-2xl border border-border-subtle p-5 shadow-xs hover:border-brand-secondary/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-surf-container font-mono text-xs font-bold text-brand-primary border border-border-subtle">
                        {tableLabel}
                      </span>
                      <span className="font-mono text-[11px] text-text-secondary">
                        #{res.reservationId}
                      </span>
                    </div>
                    <div>{renderStatusBadge(res.status)}</div>
                  </div>

                  <h3 className="font-display font-bold text-base text-brand-primary">
                    {res.customerName}
                  </h3>

                  <div className="space-y-1.5 mt-3 text-xs text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-text-secondary/70 shrink-0" />
                      <span>{res.customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-text-secondary/70 shrink-0" />
                      <span>{res.numberOfGuests} Guests {tableObj ? `(Capacity: ${tableObj.capacity})` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium text-brand-primary">
                      <Calendar className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
                      <span>{formatReservationTime(res.reservationDateTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-indigo-700">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Slot: {formatTimeSlot(res.reservationDateTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 mt-4 border-t border-border-subtle/70 flex items-center justify-between">
                  {/* Status toggle selector */}
                  <select
                    value={res.status}
                    onChange={(e) => handleStatusChange(res, e.target.value as ReservationStatus)}
                    className="text-xs font-semibold bg-surf-low border border-border-subtle rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-brand-secondary"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenDetailsModal(res)}
                      className="p-1.5 rounded-lg hover:bg-surf-container text-text-secondary hover:text-text-primary transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(res)}
                      className="p-1.5 rounded-lg hover:bg-surf-container text-text-secondary hover:text-text-primary transition-colors"
                      title="Edit Reservation"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(res)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-text-secondary hover:text-rose-600 transition-colors"
                      title="Delete Reservation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD RESERVATION MODAL                                    */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border-subtle space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-secondary/10 text-brand-secondary flex items-center justify-center">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-brand-primary">New Reservation</h3>
                  <p className="text-[11px] text-text-secondary">Book a table for upcoming guests with 2-hour duration</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surf-container text-text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conflict or Error Notification */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{formError}</div>
              </div>
            )}

            {formWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">2-Hour Conflict Warning: </span>
                  {formWarning}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Table Selection */}
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                  <span>Dining Table</span>
                  <span className="text-[10px] font-sans font-normal text-text-secondary">
                    {tables.length} tables in floorplan
                  </span>
                </label>
                <select
                  required
                  value={formTableId ?? ''}
                  onChange={(e) => setFormTableId(Number(e.target.value))}
                  className="w-full bg-surf-low border border-border-subtle rounded-lg p-2.5 text-xs font-semibold text-text-primary outline-none focus:ring-1 focus:ring-brand-secondary"
                >
                  <option value="" disabled>Select Table...</option>
                  {tables.map((t) => (
                    <option key={t.restaurantTableId} value={t.restaurantTableId}>
                      {t.tableNumber} — Capacity: {t.capacity} guests ({t.tableStatus})
                    </option>
                  ))}
                </select>
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Customer Name *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Umair"
                      value={formCustomerName}
                      onChange={(e) => setFormCustomerName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-surf-low border border-border-subtle rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-secondary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Customer Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 03001234567"
                      value={formCustomerPhone}
                      onChange={(e) => setFormCustomerPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-surf-low border border-border-subtle rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-secondary"
                    />
                  </div>
                </div>
              </div>

              {/* Party Size & Date Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Number of Guests
                  </label>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min={1}
                      max={30}
                      value={formGuests}
                      onChange={(e) => setFormGuests(parseInt(e.target.value, 10) || 1)}
                      className="w-full pl-8 pr-3 py-2 bg-surf-low border border-border-subtle rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-secondary font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Reservation Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formDateTime}
                    onChange={(e) => setFormDateTime(e.target.value)}
                    className="w-full px-3 py-2 bg-surf-low border border-border-subtle rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-secondary font-mono"
                  />
                </div>
              </div>

              {/* 2-Hour Slot preview */}
              {formDateTime && (
                <div className="p-2.5 rounded-lg bg-surf-container border border-border-subtle flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Estimated 2-Hour Window:</span>
                  <span className="font-mono font-bold text-brand-primary">{formatTimeSlot(formDateTime)}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border-subtle hover:bg-surf-low text-text-secondary font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-brand-secondary hover:bg-brand-secondary-hover text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-brand-secondary/15 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Book Table</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT RESERVATION MODAL                                   */}
      {/* ========================================================= */}
      {isEditModalOpen && activeReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border-subtle space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-brand-primary">
                    Edit Reservation #{activeReservation.reservationId}
                  </h3>
                  <p className="text-[11px] text-text-secondary">Modify booking details, table assignment, or party schedule</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surf-container text-text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{formError}</div>
              </div>
            )}

            {formWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">2-Hour Conflict Warning: </span>
                  {formWarning}
                </div>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Table Selection */}
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  Assigned Table
                </label>
                <select
                  required
                  value={formTableId ?? ''}
                  onChange={(e) => setFormTableId(Number(e.target.value))}
                  className="w-full bg-surf-low border border-border-subtle rounded-lg p-2.5 text-xs font-semibold text-text-primary outline-none focus:ring-1 focus:ring-brand-secondary"
                >
                  {tables.map((t) => (
                    <option key={t.restaurantTableId} value={t.restaurantTableId}>
                      {t.tableNumber} — Capacity: {t.capacity} guests ({t.tableStatus})
                    </option>
                  ))}
                </select>
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-surf-low border border-border-subtle rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-secondary font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Customer Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surf-low border border-border-subtle rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-secondary font-medium"
                  />
                </div>
              </div>

              {/* Party Size & Date Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={30}
                    value={formGuests}
                    onChange={(e) => setFormGuests(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-surf-low border border-border-subtle rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-secondary font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Reservation Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formDateTime}
                    onChange={(e) => setFormDateTime(e.target.value)}
                    className="w-full px-3 py-2 bg-surf-low border border-border-subtle rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-secondary font-mono"
                  />
                </div>
              </div>

              {/* 2-Hour Slot preview */}
              {formDateTime && (
                <div className="p-2.5 rounded-lg bg-surf-container border border-border-subtle flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Estimated 2-Hour Window:</span>
                  <span className="font-mono font-bold text-brand-primary">{formatTimeSlot(formDateTime)}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border-subtle hover:bg-surf-low text-text-secondary font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW DETAILS MODAL                                       */}
      {/* ========================================================= */}
      {isDetailsModalOpen && activeReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-surf-container text-brand-primary flex items-center justify-center">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-brand-primary">
                    Reservation Details
                  </h3>
                  <p className="text-[11px] font-mono text-text-secondary">
                    Reference #{activeReservation.reservationId}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surf-container text-text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surf-low border border-border-subtle">
                <span className="font-mono text-text-secondary uppercase text-[10px] font-bold">Booking Status</span>
                <div>{renderStatusBadge(activeReservation.status)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surf-low border border-border-subtle">
                  <span className="font-mono text-text-secondary uppercase text-[10px] font-bold block mb-1">Customer</span>
                  <div className="font-bold text-brand-primary text-sm">{activeReservation.customerName}</div>
                  <div className="text-text-secondary text-[11px] mt-0.5">{activeReservation.customerPhone}</div>
                </div>

                <div className="p-3 rounded-xl bg-surf-low border border-border-subtle">
                  <span className="font-mono text-text-secondary uppercase text-[10px] font-bold block mb-1">Table & Size</span>
                  <div className="font-bold text-brand-primary text-sm">
                    {activeReservation.restaurantTable?.tableNumber || `Table #${activeReservation.restaurantTableId}`}
                  </div>
                  <div className="text-text-secondary text-[11px] mt-0.5">
                    {activeReservation.numberOfGuests} Guests {activeReservation.restaurantTable ? `(${activeReservation.restaurantTable.capacity} seats)` : ''}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surf-low border border-border-subtle space-y-1.5">
                <span className="font-mono text-text-secondary uppercase text-[10px] font-bold block">Reserved Schedule</span>
                <div className="flex items-center gap-2 font-bold text-brand-primary text-sm">
                  <Calendar className="w-4 h-4 text-brand-secondary shrink-0" />
                  <span>{formatReservationTime(activeReservation.reservationDateTime)}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-indigo-800 bg-indigo-50/80 px-2 py-1 rounded-md border border-indigo-100">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>2-Hour Duration: {formatTimeSlot(activeReservation.reservationDateTime)}</span>
                </div>
              </div>

              {activeReservation.createdAt && (
                <div className="text-[11px] text-text-secondary text-right">
                  Booked on: {new Date(activeReservation.createdAt).toLocaleString()}
                </div>
              )}

              {/* Status Update Quick Switcher */}
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Update Status:</span>
                <div className="flex items-center gap-1.5">
                  {(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(activeReservation, s)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                        activeReservation.status === s 
                          ? 'bg-brand-primary text-white' 
                          : 'bg-surf-container text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle flex items-center justify-end">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold text-xs hover:bg-brand-primary/90"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION MODAL                                */}
      {/* ========================================================= */}
      {isDeleteModalOpen && activeReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border-subtle space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-base text-brand-primary">Delete Reservation?</h3>
              <p className="text-xs text-text-secondary">
                Are you sure you want to delete the reservation for <strong>{activeReservation.customerName}</strong> (Ref #{activeReservation.reservationId})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-border-subtle hover:bg-surf-low text-text-secondary font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/15 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
