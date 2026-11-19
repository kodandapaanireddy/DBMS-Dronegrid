'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Customer registration page.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push('/customer/orders');
      } else {
        const d = await res.json();
        setError(d.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">
              D
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Drone<span className="text-brand-600">Grid</span></span>
          </div>
          <a href="/login" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">
            Already have an account?
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card-glass p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-glow">
                D
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h1>
              <p className="text-slate-600 mt-1 text-sm">Join the Drone Grid network</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
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
                  minLength={8}
                />
                <p className="text-xs text-slate-400 mt-1">Must be at least 8 characters</p>
              </div>
              {error && <p className="form-error">⚠ {error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{' '}
              <a href="/login" className="text-brand-600 font-medium hover:text-brand-700">Sign in</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}