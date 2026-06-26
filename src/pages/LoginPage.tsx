import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LogIn, Phone, Lock, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await login(phone, password);
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('Welcome back!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-orange/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-orange mb-6 shadow-lg shadow-brand-cyan/20">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Welcome Back</h1>
          <p className="text-brand-muted text-sm font-sans">Sign in to your Split Bag account</p>
        </div>

        <div className="card-premium p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider ml-1">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-brand-cyan transition-colors" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="input-field pl-12 py-4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-brand-cyan transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-12 py-4"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold rounded-2xl"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-brand-muted text-sm font-sans">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-cyan hover:text-brand-cyan/80 font-semibold transition-colors">
              Create one here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
