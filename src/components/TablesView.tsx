import React, { useState, useEffect } from 'react';
import { RestaurantTable, TableStatus } from '../types';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Users, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  X, 
  Check, 
  Hash, 
  Activity,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';
import { apiTables } from '../api';

interface TablesViewProps {
  tables: RestaurantTable[];
  onTablesChange: (updated: RestaurantTable[]) => void;
  apiEnabled?: boolean;
}

export default function TablesView({
  tables,
  onTablesChange
}: TablesViewProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FREE' | 'OCCUPIED' | 'RESERVED'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [deletingTable, setDeletingTable] = useState<RestaurantTable | null>(null);
  const [inspectTable, setInspectTable] = useState<RestaurantTable | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick lookup
  const [lookupId, setLookupId] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Form states for Add Modal
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState<number>(4);
  const [newStatus, setNewStatus] = useState<TableStatus>('FREE');

  // Form states for Edit Modal
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editCapacity, setEditCapacity] = useState<number>(4);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null), 3500;
    });
  };

  // Helper: Find next available table names
  const getNextAvailableSuggestions = (count: number = 3): string[] => {
    const existing = new Set(tables.map(t => t.tableNumber.trim().toUpperCase()));
    const suggestions: string[] = [];
    for (let i = 1; i <= 99 && suggestions.length < count; i++) {
      const candidate = i < 10 ? `T-0${i}` : `T-${i}`;
      if (!existing.has(candidate.toUpperCase())) {
        suggestions.push(candidate);
      }
    }
    return suggestions;
  };

  const isTableNameTaken = (name: string, excludeId?: number): boolean => {
    const normalized = name.trim().toUpperCase();
    if (!normalized) return false;
    return tables.some(t => 
      t.tableNumber.trim().toUpperCase() === normalized && 
      (excludeId === undefined || t.restaurantTableId !== excludeId)
    );
  };

  // Auto-refresh tables from backend on view mount to ensure real-time database sync
  useEffect(() => {
    let isMounted = true;
    apiTables.list()
      .then((liveList) => {
        if (isMounted && Array.isArray(liveList)) {
          onTablesChange(liveList);
        }
      })
      .catch((err) => {
        console.warn('Silent tables initial load failed, using cached state:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Fetch All Tables
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const liveList = await apiTables.list();
      if (Array.isArray(liveList)) {
        onTablesChange(liveList);
        showNotification('success', `Tables synchronized successfully.`);
      }
    } catch (err: any) {
      showNotification('error', `Failed to synchronize tables: ${err.message || 'Connection error'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. Lookup Table By ID
  const handleLookupById = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = lookupId.trim();
    if (!id) return;

    setIsLookingUp(true);
    try {
      const table = await apiTables.getById(id);
      if (table && table.restaurantTableId) {
        setInspectTable(table);
      } else {
        showNotification('error', `Table with ID "${id}" was not found.`);
      }
    } catch {
      showNotification('error', `Table with ID "${id}" was not found.`);
    } finally {
      setIsLookingUp(false);
    }
  };

  const openTableDetails = async (table: RestaurantTable) => {
    try {
      const live = await apiTables.getById(table.restaurantTableId);
      setInspectTable(live || table);
    } catch {
      setInspectTable(table);
    }
  };

  // 3. Open Create Modal with smart auto-suggestion
  const handleOpenAddModal = () => {
    const suggestions = getNextAvailableSuggestions(1);
    const suggestedName = suggestions.length > 0 ? suggestions[0] : `T-${tables.length + 1}`;
    setNewTableNumber(suggestedName);
    setNewCapacity(4);
    setNewStatus('FREE');
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newTableNumber.trim();
    if (!trimmedName || newCapacity <= 0) {
      showNotification('error', 'Please enter a valid table number and seating capacity.');
      return;
    }

    if (isTableNameTaken(trimmedName)) {
      showNotification('error', `Table number "${trimmedName}" already exists. Please choose a different name.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiTables.create({
        tableNumber: trimmedName,
        capacity: Number(newCapacity),
        tableStatus: newStatus
      });

      const updatedList = [created, ...tables.filter(t => t.restaurantTableId !== created.restaurantTableId)];
      onTablesChange(updatedList);
      setIsAddModalOpen(false);
      showNotification('success', `Table ${created.tableNumber} added successfully.`);
    } catch (err: any) {
      showNotification('error', `Failed to create table: ${err.message || 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Update Table
  const handleOpenEditModal = (table: RestaurantTable) => {
    setEditingTable(table);
    setEditTableNumber(table.tableNumber);
    setEditCapacity(table.capacity);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || editCapacity <= 0) {
      showNotification('error', 'Please enter a valid seating capacity.');
      return;
    }

    const trimmedName = editTableNumber.trim();
    if (trimmedName && isTableNameTaken(trimmedName, editingTable.restaurantTableId)) {
      showNotification('error', `Table number "${trimmedName}" is already assigned to another table.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: { capacity: number; tableNumber?: string } = {
        capacity: Number(editCapacity)
      };

      if (trimmedName && trimmedName !== editingTable.tableNumber) {
        payload.tableNumber = trimmedName;
      }

      const updated = await apiTables.update(editingTable.restaurantTableId, payload);
      
      const updatedList = tables.map(t => 
        t.restaurantTableId === editingTable.restaurantTableId ? { ...t, ...updated } : t
      );
      onTablesChange(updatedList);
      setEditingTable(null);
      showNotification('success', `Table ${updated.tableNumber || editingTable.tableNumber} updated successfully.`);
    } catch (err: any) {
      showNotification('error', `Failed to update table: ${err.message || 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Table
  const handleDeleteConfirm = async () => {
    if (!deletingTable) return;

    setIsSubmitting(true);
    try {
      await apiTables.delete(deletingTable.restaurantTableId);
      const updatedList = tables.filter(t => t.restaurantTableId !== deletingTable.restaurantTableId);
      onTablesChange(updatedList);
      showNotification('success', `Table ${deletingTable.tableNumber} removed successfully.`);
      setDeletingTable(null);
    } catch (err: any) {
      showNotification('error', `Failed to delete table: ${err.message || 'Please try again'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered list
  const filteredTables = tables.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.tableStatus.toUpperCase() === statusFilter;
    const matchesQuery = 
      t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      String(t.restaurantTableId).includes(searchQuery.trim());
    return matchesStatus && matchesQuery;
  });

  // Overview metrics
  const totalTables = tables.length;
  const freeTables = tables.filter(t => t.tableStatus.toUpperCase() === 'FREE').length;
  const occupiedTables = tables.filter(t => t.tableStatus.toUpperCase() === 'OCCUPIED').length;
  const reservedTables = tables.filter(t => t.tableStatus.toUpperCase() === 'RESERVED').length;
  const totalCapacity = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);

  const addNameIsTaken = isTableNameTaken(newTableNumber);
  const editNameIsTaken = editingTable ? isTableNameTaken(editTableNumber, editingTable.restaurantTableId) : false;
  const suggestionsList = getNextAvailableSuggestions(4);

  return (
    <div className="px-10 py-6 max-w-7xl mx-auto space-y-8" id="restaurant-tables-view">
      
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-3 ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-semibold text-[32px] text-brand-primary leading-tight">
              Restaurant Table Management
            </h1>
            <span className="px-2.5 py-0.5 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-full font-mono text-[11px] font-bold">
              Admin Only
            </span>
          </div>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Manage dining floor capacity, table arrangements, and real-time availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-border-subtle text-text-primary text-xs font-bold hover:bg-surf-low transition-all shadow-xs active-scale"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-secondary' : 'text-text-secondary'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Tables'}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition-all shadow-sm active-scale"
          >
            <Plus className="w-4 h-4" />
            <span>Create Table</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Total Tables</p>
            <h3 className="font-display font-bold text-2xl text-brand-primary">{totalTables}</h3>
            <p className="text-[11px] text-text-tertiary mt-1">{totalCapacity} total seating capacity</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Available / Free</p>
            <h3 className="font-display font-bold text-2xl text-emerald-600">{freeTables}</h3>
            <p className="text-[11px] text-emerald-700/80 mt-1">Ready for seating</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Occupied</p>
            <h3 className="font-display font-bold text-2xl text-amber-600">{occupiedTables}</h3>
            <p className="text-[11px] text-amber-700/80 mt-1">Active dining sessions</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Reserved</p>
            <h3 className="font-display font-bold text-2xl text-indigo-600">{reservedTables}</h3>
            <p className="text-[11px] text-indigo-700/80 mt-1">Booked for upcoming guests</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Search Section */}
      <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-surf-low text-text-secondary hover:bg-surf-container'
            }`}
          >
            All Tables ({totalTables})
          </button>
          <button
            onClick={() => setStatusFilter('FREE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'FREE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-surf-low text-text-secondary hover:bg-surf-container'
            }`}
          >
            Free ({freeTables})
          </button>
          <button
            onClick={() => setStatusFilter('OCCUPIED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'OCCUPIED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-surf-low text-text-secondary hover:bg-surf-container'
            }`}
          >
            Occupied ({occupiedTables})
          </button>
          <button
            onClick={() => setStatusFilter('RESERVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'RESERVED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-surf-low text-text-secondary hover:bg-surf-container'
            }`}
          >
            Reserved ({reservedTables})
          </button>
        </div>

        {/* Search & Quick Lookup */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table number..."
              className="w-full bg-surf-low border border-border-subtle rounded-xl pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-brand-secondary outline-none text-text-primary"
            />
          </div>

          <form onSubmit={handleLookupById} className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36">
              <Hash className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="ID (e.g. 3)"
                className="w-full bg-surf-low border border-border-subtle rounded-xl pl-7 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-brand-secondary outline-none text-text-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isLookingUp || !lookupId.trim()}
              className="px-3 py-1.5 bg-surf-container hover:bg-surf-high border border-border-subtle rounded-xl text-xs font-bold text-text-primary flex items-center gap-1 transition-all disabled:opacity-50"
            >
              {isLookingUp ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
              <span>Find Table</span>
            </button>
          </form>
        </div>
      </div>

      {/* Tables Grid Layout */}
      {filteredTables.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-2xl p-12 text-center shadow-xs">
          <Layers className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-40" />
          <h3 className="font-display font-semibold text-lg text-brand-primary mb-1">No Tables Found</h3>
          <p className="text-text-secondary text-xs max-w-sm mx-auto mb-4">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No restaurant tables match your active search or status filter.'
              : 'No tables registered in the system yet. Click below to add one.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Table</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const isFree = table.tableStatus.toUpperCase() === 'FREE';
            const isOccupied = table.tableStatus.toUpperCase() === 'OCCUPIED';

            return (
              <div 
                key={table.restaurantTableId}
                className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Status Indicator Top Bar */}
                <div 
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isFree ? 'bg-emerald-500' : isOccupied ? 'bg-amber-500' : 'bg-indigo-500'
                  }`}
                />

                {/* Table Header */}
                <div className="flex items-start justify-between gap-2 mb-4 pt-1">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-text-tertiary">
                      Table ID #{table.restaurantTableId}
                    </span>
                    <h3 className="font-display font-bold text-xl text-brand-primary mt-0.5">
                      {table.tableNumber}
                    </h3>
                  </div>

                  <span 
                    className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                      isFree 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : isOccupied 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {isFree ? 'Available' : table.tableStatus}
                  </span>
                </div>

                {/* Table Details */}
                <div className="space-y-3 py-2 border-y border-border-subtle/60 my-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-text-tertiary" />
                      <span>Capacity:</span>
                    </span>
                    <span className="font-bold font-mono text-brand-primary bg-surf-low px-2 py-0.5 rounded-md">
                      {table.capacity} Guests
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-text-tertiary" />
                      <span>Status:</span>
                    </span>
                    <span className="text-text-secondary font-medium">
                      {isFree ? 'Ready for Seating' : isOccupied ? 'Guests Dining' : 'Reserved'}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-1">
                  <button
                    onClick={() => openTableDetails(table)}
                    className="p-1.5 rounded-lg bg-surf-low hover:bg-surf-container text-text-secondary hover:text-brand-primary transition-all text-xs font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(table)}
                      className="p-1.5 rounded-lg hover:bg-brand-primary/10 text-text-secondary hover:text-brand-primary transition-all"
                      title="Edit Table"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingTable(table)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-text-secondary hover:text-rose-600 transition-all"
                      title="Delete Table"
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

      {/* MODAL 1: ADD TABLE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-brand-primary">Add Restaurant Table</h3>
                  <p className="text-text-secondary text-xs">Configure table number, seating capacity, and status.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surf-container text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-text-primary">
                    Table Number <span className="text-rose-500">*</span>
                  </label>
                  {suggestionsList.length > 0 && (
                    <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-brand-secondary" />
                      Suggested
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  required
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="e.g. T-07"
                  className={`w-full bg-surf-low border rounded-xl px-3.5 py-2 text-sm focus:ring-2 outline-none text-text-primary font-medium ${
                    addNameIsTaken 
                      ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500' 
                      : 'border-border-subtle focus:ring-brand-secondary/20 focus:border-brand-secondary'
                  }`}
                />

                {/* Validation message */}
                {addNameIsTaken && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Table number "{newTableNumber}" is already in use. Please select or enter an available name.</span>
                  </p>
                )}

                {/* Available Suggestions Quick-Click Pills */}
                {suggestionsList.length > 0 && (
                  <div className="mt-2.5">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
                      Available Table Names:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {suggestionsList.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setNewTableNumber(sug)}
                          className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                            newTableNumber.trim().toUpperCase() === sug.toUpperCase()
                              ? 'bg-brand-secondary text-white border-brand-secondary'
                              : 'bg-surf-low hover:bg-surf-container border-border-subtle text-text-secondary hover:text-brand-primary'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Seating Capacity (Guests) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-surf-low border border-border-subtle rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary outline-none text-text-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Initial Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TableStatus)}
                  className="w-full bg-surf-low border border-border-subtle rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary outline-none text-text-primary font-medium"
                >
                  <option value="FREE">Available (Free)</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="RESERVED">Reserved</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surf-low rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || addNameIsTaken}
                  className="px-5 py-2 text-xs font-bold bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Table</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT TABLE */}
      {editingTable && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-brand-primary">
                    Edit Table {editingTable.tableNumber}
                  </h3>
                  <p className="text-text-secondary text-xs">Update table number and seating capacity.</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingTable(null)}
                className="p-1 rounded-lg hover:bg-surf-container text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Table Number
                </label>
                <input
                  type="text"
                  value={editTableNumber}
                  onChange={(e) => setEditTableNumber(e.target.value)}
                  placeholder="e.g. T-07"
                  className={`w-full bg-surf-low border rounded-xl px-3.5 py-2 text-sm focus:ring-2 outline-none text-text-primary font-medium ${
                    editNameIsTaken 
                      ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500' 
                      : 'border-border-subtle focus:ring-brand-secondary/20 focus:border-brand-secondary'
                  }`}
                />
                {editNameIsTaken ? (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Table number "{editTableNumber}" is already in use by another table.</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-text-tertiary mt-1">Current table number: {editingTable.tableNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Seating Capacity (Guests) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-surf-low border border-border-subtle rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary outline-none text-text-primary font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surf-low rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || editNameIsTaken}
                  className="px-5 py-2 text-xs font-bold bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deletingTable && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-border-subtle rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-lg text-brand-primary">Remove Table</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Are you sure you want to remove <strong className="text-brand-primary">{deletingTable.tableNumber}</strong> from the floor layout?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTable(null)}
                className="px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surf-low rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TABLE DETAILS */}
      {inspectTable && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-secondary/10 text-brand-secondary">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-brand-primary">
                    Table Details: {inspectTable.tableNumber}
                  </h3>
                  <p className="text-text-secondary text-xs">Floor assignment and seating overview.</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectTable(null)}
                className="p-1 rounded-lg hover:bg-surf-container text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clean summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surf-low border border-border-subtle rounded-xl p-3.5">
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">Table Name</span>
                <span className="font-display font-bold text-lg text-brand-primary mt-1 block">
                  {inspectTable.tableNumber}
                </span>
              </div>

              <div className="bg-surf-low border border-border-subtle rounded-xl p-3.5">
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">Seating Capacity</span>
                <span className="font-display font-bold text-lg text-brand-primary mt-1 block">
                  {inspectTable.capacity} Guests
                </span>
              </div>

              <div className="bg-surf-low border border-border-subtle rounded-xl p-3.5">
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">Availability</span>
                <span className={`font-mono text-xs font-bold mt-1.5 inline-block px-2 py-0.5 rounded-md ${
                  inspectTable.tableStatus.toUpperCase() === 'FREE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : inspectTable.tableStatus.toUpperCase() === 'OCCUPIED'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {inspectTable.tableStatus.toUpperCase() === 'FREE' ? 'Available' : inspectTable.tableStatus}
                </span>
              </div>

              <div className="bg-surf-low border border-border-subtle rounded-xl p-3.5">
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">System ID</span>
                <span className="font-mono text-xs font-bold text-text-secondary mt-1.5 block">
                  #{inspectTable.restaurantTableId}
                </span>
              </div>
            </div>

            <div className="bg-surf-low/60 border border-border-subtle/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-text-secondary">
              <Info className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {inspectTable.tableStatus.toUpperCase() === 'FREE' 
                  ? 'This table is currently vacant and ready for new guest dining orders.'
                  : inspectTable.tableStatus.toUpperCase() === 'OCCUPIED'
                  ? 'This table has an active order in progress and is currently occupied by guests.'
                  : 'This table has a pending reservation.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  const target = inspectTable;
                  setInspectTable(null);
                  handleOpenEditModal(target);
                }}
                className="px-4 py-2 text-xs font-bold bg-surf-container text-text-primary rounded-xl hover:bg-surf-high transition-all flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Table</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectTable(null)}
                className="px-5 py-2 text-xs font-bold bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
