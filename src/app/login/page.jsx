'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Login page. Sets the httpOnly auth cookie via the API.
 */
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(data.user.role === 'grid_admin' ? '/admin/dashboard' : '/customer/orders');
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">
              D
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Drone<span className="text-brand-600">Grid</span></span>
          </div>
          <a href="/register" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">
            Create Account
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card-glass p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-xl">
                D
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
              <p className="text-slate-600 mt-1 text-sm">Sign in to your Drone Grid account</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              {error && <p className="form-error">⚠ {error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Demo Credentials</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grid Admin</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <a href="/register" className="text-brand-600 font-medium hover:text-brand-700">Create one</a>
          </p>
        </div>
      </main>
    </div>
  );
}