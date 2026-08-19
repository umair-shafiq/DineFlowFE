import React, { useState } from 'react';
import { ChefHat, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { apiAuth } from '../api';
import { AuthUser } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  sessionExpiredMessage?: string | null;
}

export default function LoginView({ onLoginSuccess, sessionExpiredMessage }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(sessionExpiredMessage || null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Call POST /api/auth/login
      const user = await apiAuth.login({
        email: email.trim(),
        password
      });

      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.status === 401 || err.message === 'Invalid email or password' || String(err.message).toLowerCase().includes('401')) {
        setErrorMessage('Invalid email or password');
      } else if (err.isNetworkError || String(err.message).toLowerCase().includes('connect')) {
        setErrorMessage(err.message || 'Cannot reach Spring Boot server at http://localhost:8080/api/auth/login. Please make sure the backend is running.');
      } else {
        setErrorMessage(err.message || 'Invalid email or password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surf-bg flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden" id="dineflow-login-container">
      {/* Background Decorative Accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-secondary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Centered Login Card */}
      <div className="w-full max-w-md bg-white border border-border-subtle rounded-2xl shadow-xl p-8 sm:p-10 relative z-10" id="login-card">
        {/* Header / Brand */}
        <div className="text-center mb-8" id="login-header">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-primary text-white rounded-2xl shadow-md mb-4 ring-4 ring-brand-primary/10">
            <ChefHat className="w-8 h-8" />
          </div>
          <h1 className="font-display font-black text-2xl text-brand-primary tracking-tight">
            DineFlow
          </h1>
          <p className="font-sans text-xs text-text-secondary mt-1 font-medium">
            Restaurant POS &amp; Kitchen Management System
          </p>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div 
            id="login-error-banner"
            className="mb-6 p-3.5 bg-brand-accent-red/10 border border-brand-accent-red/30 rounded-xl flex items-start gap-2.5 text-brand-accent-red text-xs font-semibold animate-in fade-in slide-in-from-top-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4" id="login-form">
          {/* Email Field */}
          <div className="space-y-1.5" id="login-email-group">
            <label className="font-mono text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@dineflow.com"
                autoComplete="email"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-surf-low border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:ring-2 focus:ring-brand-secondary/40 focus:border-brand-secondary outline-none transition-all disabled:opacity-50"
              />
              <Mail className="w-4 h-4 text-text-secondary/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5" id="login-password-group">
            <label className="font-mono text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full pl-10 pr-11 py-2.5 text-sm bg-surf-low border border-border-subtle rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:ring-2 focus:ring-brand-secondary/40 focus:border-brand-secondary outline-none transition-all disabled:opacity-50"
              />
              <Lock className="w-4 h-4 text-text-secondary/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                id="login-toggle-password"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary/70 hover:text-text-primary transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-brand-primary/20 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <footer className="mt-6 text-center text-xs text-text-secondary/70 font-sans" id="login-footer">
        DineFlow Restaurant POS &bull; Kitchen Management System
      </footer>
    </div>
  );
}
