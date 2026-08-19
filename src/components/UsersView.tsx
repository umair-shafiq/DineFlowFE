import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Edit2, 
  KeyRound, 
  RefreshCw, 
  Mail, 
  Check, 
  X, 
  Lock, 
  Calendar,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Filter
} from 'lucide-react';
import { apiUsers } from '../api';

interface UsersViewProps {
  users: User[];
  onUsersChange: (users: User[]) => void;
  apiEnabled?: boolean;
}

export default function UsersView({ users, onUsersChange, apiEnabled = false }: UsersViewProps) {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'WAITER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form States for New User
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('WAITER');
  
  // Form States for Edit User
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('WAITER');

  // Loading & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Email specific lookup state
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Refresh all users from API
  const handleRefreshUsers = async () => {
    setIsRefreshing(true);
    try {
      const list = await apiUsers.list();
      onUsersChange(list);
      showFeedback('success', `Loaded ${list.length} users from server.`);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      showFeedback('error', err.message || 'Failed to refresh users list from API.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Search user by email via dedicated API endpoint
  const handleSearchByEmailApi = async () => {
    if (!searchQuery.trim() || !searchQuery.includes('@')) {
      showFeedback('error', 'Please enter a valid email address in the search box.');
      return;
    }
    setIsSearchingApi(true);
    try {
      const found = await apiUsers.searchByEmail(searchQuery.trim());
      if (found && found.email) {
        // Merge or highlight found user
        const exists = users.some(u => u.userId === found.userId || u.email === found.email);
        if (!exists) {
          onUsersChange([found, ...users]);
        }
        showFeedback('success', `Found user: ${found.fullName} (${found.userRole})`);
      } else {
        showFeedback('error', `No user found with email ${searchQuery}`);
      }
    } catch (err: any) {
      console.error('Search by email error:', err);
      showFeedback('error', `User search failed: ${err.message || 'Not found'}`);
    } finally {
      setIsSearchingApi(false);
    }
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim() || !newPassword) {
      showFeedback('error', 'Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiUsers.create({
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        userRole: newRole
      });

      // Update state
      const updatedList = [created, ...users.filter(u => u.userId !== created.userId && u.email !== created.email)];
      onUsersChange(updatedList);
      
      // Reset form & close
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('WAITER');
      setIsAddModalOpen(false);
      showFeedback('success', `User ${created.fullName} (${created.userRole}) created successfully!`);
    } catch (err: any) {
      console.error('Failed to create user:', err);
      // Fallback local creation if offline
      if (!apiEnabled) {
        const localUser: User = {
          userId: Date.now(),
          fullName: newFullName.trim(),
          email: newEmail.trim(),
          userRole: newRole,
          userStatus: true,
          createdAt: new Date().toISOString()
        };
        onUsersChange([localUser, ...users]);
        setNewFullName('');
        setNewEmail('');
        setNewPassword('');
        setIsAddModalOpen(false);
        showFeedback('success', `User ${localUser.fullName} added locally.`);
      } else {
        showFeedback('error', err.message || 'Failed to create user via API.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditRole(user.userRole);
    setEditPassword('');
  };

  // Update User Handler
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      const payload: { fullName: string; password?: string; userRole: UserRole } = {
        fullName: editFullName.trim(),
        userRole: editRole
      };
      if (editPassword.trim().length > 0) {
        payload.password = editPassword.trim();
      }

      const updated = await apiUsers.update(editingUser.userId, payload);
      
      const updatedList = users.map(u => u.userId === editingUser.userId ? { ...u, ...updated } : u);
      onUsersChange(updatedList);
      setEditingUser(null);
      showFeedback('success', `User ${updated.fullName} updated successfully!`);
    } catch (err: any) {
      console.error('Failed to update user:', err);
      // Local fallback
      const updatedList = users.map(u => u.userId === editingUser.userId ? {
        ...u,
        fullName: editFullName.trim(),
        userRole: editRole
      } : u);
      onUsersChange(updatedList);
      setEditingUser(null);
      showFeedback('success', `User profile updated locally.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle User Status Handler
  const handleToggleStatus = async (user: User) => {
    const newStatus = !user.userStatus;
    try {
      const updated = await apiUsers.updateStatus(user.userId, newStatus);
      const updatedList = users.map(u => u.userId === user.userId ? { ...u, userStatus: updated.userStatus } : u);
      onUsersChange(updatedList);
      showFeedback('success', `User ${user.fullName} is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      // Fallback local toggle
      const updatedList = users.map(u => u.userId === user.userId ? { ...u, userStatus: newStatus } : u);
      onUsersChange(updatedList);
      showFeedback('success', `User status toggled locally to ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`);
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(u.userId).includes(searchQuery);

    const matchesRole = roleFilter === 'ALL' || u.userRole === roleFilter;
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && u.userStatus) ||
      (statusFilter === 'INACTIVE' && !u.userStatus);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalAdmins = users.filter(u => u.userRole === 'ADMIN').length;
  const totalWaiters = users.filter(u => u.userRole === 'WAITER').length;
  const totalActive = users.filter(u => u.userStatus).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6" id="users-view-root">
      {/* View Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle/70 pb-6" id="users-header">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="font-display font-extrabold text-2xl text-brand-primary tracking-tight">
              User Management
            </h1>
          </div>
          <p className="font-sans text-xs text-text-secondary mt-1">
            Create, manage roles, and toggle access for Admin and Waiter personnel.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            id="refresh-users-btn"
            onClick={handleRefreshUsers}
            disabled={isRefreshing}
            className="px-3 py-2 bg-surf-low hover:bg-surf-container border border-border-subtle rounded-xl text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            title="Refresh users from backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-secondary' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            id="add-user-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Notification */}
      {feedback && (
        <div
          id="users-feedback-banner"
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Stats Summary Bento Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="users-stats-grid">
        <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase font-bold text-text-secondary tracking-wider">Total Users</p>
          <p className="font-display text-2xl font-black text-brand-primary mt-1">{users.length}</p>
        </div>
        <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase font-bold text-text-secondary tracking-wider">Active Personnel</p>
          <p className="font-display text-2xl font-black text-emerald-600 mt-1">{totalActive}</p>
        </div>
        <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase font-bold text-text-secondary tracking-wider">Admins</p>
          <p className="font-display text-2xl font-black text-indigo-600 mt-1">{totalAdmins}</p>
        </div>
        <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
          <p className="font-mono text-[10px] uppercase font-bold text-text-secondary tracking-wider">Waiters</p>
          <p className="font-display text-2xl font-black text-amber-600 mt-1">{totalWaiters}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs space-y-3" id="users-toolbar">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input with Search by Email API trigger */}
          <div className="relative w-full md:w-96 flex gap-2">
            <div className="relative flex-1">
              <input
                id="users-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email or ID..."
                className="w-full pl-9 pr-4 py-2 bg-surf-low border border-border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-secondary/50 focus:ring-1 focus:ring-brand-secondary outline-none font-sans"
              />
              <Search className="w-4 h-4 text-text-secondary/70 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            {searchQuery.includes('@') && (
              <button
                id="search-by-email-api-btn"
                type="button"
                onClick={handleSearchByEmailApi}
                disabled={isSearchingApi}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold shrink-0 transition-all"
                title="Search on backend database via GET /api/users/users/search?email=..."
              >
                {isSearchingApi ? 'Searching...' : 'API Search'}
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Role Filter */}
            <div className="flex items-center bg-surf-low p-1 rounded-xl border border-border-subtle text-xs font-medium">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${roleFilter === 'ALL' ? 'bg-white shadow-xs font-bold text-brand-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                All Roles
              </button>
              <button
                onClick={() => setRoleFilter('ADMIN')}
                className={`px-3 py-1 rounded-lg transition-all ${roleFilter === 'ADMIN' ? 'bg-white shadow-xs font-bold text-indigo-700' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Admins
              </button>
              <button
                onClick={() => setRoleFilter('WAITER')}
                className={`px-3 py-1 rounded-lg transition-all ${roleFilter === 'WAITER' ? 'bg-white shadow-xs font-bold text-amber-700' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Waiters
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-surf-low p-1 rounded-xl border border-border-subtle text-xs font-medium">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white shadow-xs font-bold text-brand-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'ACTIVE' ? 'bg-white shadow-xs font-bold text-emerald-700' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'INACTIVE' ? 'bg-white shadow-xs font-bold text-rose-700' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Disabled
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-border-subtle rounded-2xl shadow-xs overflow-hidden" id="users-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="users-table">
            <thead>
              <tr className="border-b border-border-subtle bg-surf-low/60 text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider">
                <th className="py-3.5 px-5">ID</th>
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Created At</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-secondary">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">No users found</p>
                    <p className="text-[11px] mt-0.5">Try adjusting your search criteria or register a new user.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.userId || user.email} className="hover:bg-surf-low/40 transition-colors group">
                    {/* User ID */}
                    <td className="py-3.5 px-5 font-mono text-text-secondary font-bold">
                      #{user.userId}
                    </td>

                    {/* User Name & Email */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surf-container border border-border-subtle flex items-center justify-center font-bold text-brand-primary text-xs uppercase">
                          {user.fullName ? user.fullName.slice(0, 2) : 'DF'}
                        </div>
                        <div>
                          <p className="font-bold text-brand-primary">{user.fullName}</p>
                          <p className="text-text-secondary text-[11px] font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3 opacity-60" />
                            <span>{user.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold uppercase ${
                        user.userRole === 'ADMIN'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                          : 'bg-amber-50 text-amber-800 border border-amber-200/80'
                      }`}>
                        {user.userRole === 'ADMIN' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        <span>{user.userRole}</span>
                      </span>
                    </td>

                    {/* Status Toggle Switch */}
                    <td className="py-3.5 px-5">
                      <button
                        id={`toggle-user-status-${user.userId}`}
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-[11px] border transition-all cursor-pointer ${
                          user.userStatus
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Click to toggle user status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.userStatus ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        <span>{user.userStatus ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-5 font-mono text-[11px] text-text-secondary">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : '—'}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`edit-user-btn-${user.userId}`}
                          onClick={() => openEditModal(user)}
                          className="p-1.5 hover:bg-surf-container text-text-secondary hover:text-brand-primary rounded-lg transition-colors"
                          title="Edit user details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-brand-primary/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" id="add-user-modal">
          <div className="bg-white border border-border-subtle rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-border-subtle pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-primary text-white rounded-xl">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-lg text-brand-primary">
                  Add New User
                </h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-surf-container rounded-lg text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="font-mono text-[11px] font-bold text-text-secondary uppercase">Full Name</label>
                <input
                  id="new-user-fullname"
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Umair"
                  className="w-full p-2.5 bg-surf-low border border-border-subtle rounded-xl text-xs text-text-primary focus:ring-1 focus:ring-brand-secondary outline-none"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="font-mono text-[11px] font-bold text-text-secondary uppercase">Email Address</label>
                <input
                  id="new-user-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="umair@dineflow.com"
                  className="w-full p-2.5 bg-surf-low border border-border-subtle rounded-xl text-xs text-text-primary focus:ring-1 focus:ring-brand-secondary outline-none"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="font-mono text-[11px] font-bold text-text-secondary uppercase">Password</label>
                <input
                  id="new-user-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-surf-low border border-border-subtle rounded-xl text-xs text-text-primary focus:ring-1 focus:ring-brand-secondary outline-none"
                />
              </div>

              {/* Role Selector */}
              <div className="space-y-1">
                <label className="font-mono text-[11px] font-bold text-text-secondary uppercase">Assign Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('ADMIN')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      newRole === 'ADMIN'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs'
                        : 'bg-surf-low border-border-subtle text-text-secondary'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ADMIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('WAITER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      newRole === 'WAITER'
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                        : 'bg-surf-low border-border-subtle text-text-secondary'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>WAITER</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surf-container rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="submit-create-user-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-brand-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-brand-primary/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" id="edit-user-modal">
          <div className="bg-white border border-border-subtle rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-border-subtle pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-secondary text-white rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-brand-primary">
                    Edit User #{editingUser.userId}
                  </h3>
                  <p className="text-text-secondary text-[11px] font-mono">{editingUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-surf-container rounded-lg text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="font-mono text-[11px] font-bold text-text-secondary uppercase">Full Name</label>
                <input
                  id="edit-user-fullname"
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full p-2.5 bg-surf-low border border-border-subtle rounded-xl text-xs text-text-primary focus:ring-1 focus:ring-brand-secondary outline-none"
                />
              </div>

              {/* Password (Optional for updates) */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="font-mono text-[11px] font-bold text-text-secondary uppercase">New Password</label>
                  <span className="text-[10px] text-text-secondary italic">Optional (leave blank to keep unchanged)</span>
                </div>
                <input
                  id="edit-user-password"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password if changing"
                  className="w-full p-2.5 bg-surf-low border border-border-subtle rounded-xl text-xs text-text-primary focus:ring-1 focus:ring-brand-secondary outline-none"
                />
              </div>

              {/* Role Selector */}
              <div className="space-y-1">
                <label className="font-mono text-[11px] font-bold text-text-secondary uppercase">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('ADMIN')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      editRole === 'ADMIN'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs'
                        : 'bg-surf-low border-border-subtle text-text-secondary'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ADMIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('WAITER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      editRole === 'WAITER'
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                        : 'bg-surf-low border-border-subtle text-text-secondary'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>WAITER</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surf-container rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="submit-edit-user-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-brand-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
