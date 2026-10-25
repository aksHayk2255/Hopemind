import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Lock, Mail, ArrowRight, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';

export const Login: React.FC = () => {
  const { login, quickDemoLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('expired') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'mother') navigate('/mother');
      else if (loggedUser.role === 'doctor') navigate('/doctor');
      else if (loggedUser.role === 'admin') navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (key: 'mother_priya' | 'mother_ananya' | 'doctor' | 'admin') => {
    setError('');
    setLoading(true);
    try {
      const loggedUser = await quickDemoLogin(key);
      if (loggedUser.role === 'mother') navigate('/mother');
      else if (loggedUser.role === 'doctor') navigate('/doctor');
      else if (loggedUser.role === 'admin') navigate('/admin');
    } catch (err: any) {
      setError('Failed to login with demo account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 subtle-gradient">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-3xl bg-gradient-to-tr from-lavender-600 via-lavender-500 to-teal-400 items-center justify-center shadow-card mb-3">
            <Heart className="w-7 h-7 text-white fill-white/20" />
          </div>
          <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight">
            Welcome to HopeMind
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Compassionate, AI-Assisted Postpartum Wellness Support
          </p>
        </div>

        {isExpired && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            Your session expired. Please sign in again.
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </div>
        )}

        {/* Login Form */}
        <div className="bg-white p-8 rounded-3xl shadow-card border border-slate-200/80 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-lavender-500 focus:ring-2 focus:ring-lavender-200 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-lavender-500 focus:ring-2 focus:ring-lavender-200 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-label="Login"
              className="w-full min-h-12 py-3 rounded-xl bg-[#5b4bdb] hover:bg-[#4938b9] active:scale-[0.99] text-white font-semibold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-lavender-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Instant Demo Logins (Viva & Review)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => handleDemoClick('mother_priya')}
                disabled={loading}
                className="p-2.5 rounded-xl border border-lavender-200 bg-lavender-50/60 hover:bg-lavender-100/70 transition-all text-xs"
              >
                <span className="font-bold text-lavender-900 block truncate">Priya Sharma</span>
                <span className="text-[10px] text-lavender-700 block">Mother (Normal)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('mother_ananya')}
                disabled={loading}
                className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 transition-all text-xs"
              >
                <span className="font-bold text-rose-900 block truncate">Ananya Patel</span>
                <span className="text-[10px] text-rose-700 font-semibold block">Mother (High Q10)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('doctor')}
                disabled={loading}
                className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 transition-all text-xs"
              >
                <span className="font-bold text-teal-900 block truncate">Dr. S. Sharma</span>
                <span className="text-[10px] text-teal-700 block">Psychiatrist</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('admin')}
                disabled={loading}
                className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 transition-all text-xs"
              >
                <span className="font-bold text-purple-900 block truncate">Administrator</span>
                <span className="text-[10px] text-purple-700 block">AI Governance</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-2 text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-lavender-700 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
