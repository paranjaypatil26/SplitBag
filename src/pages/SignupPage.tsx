import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { UserPlus, Phone, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SignupPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !displayName) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await signup(phone, password, displayName);
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('Account created successfully!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-orange/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-orange mb-6 shadow-lg shadow-brand-cyan/20">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Create Account</h1>
          <p className="text-brand-muted text-sm font-sans">Join the Split Bag community</p>
        </div>

        <div className="card-premium p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-brand-cyan transition-colors" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="input-field pl-12 py-4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider ml-1">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-brand-cyan transition-colors" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
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
                  placeholder="Create a strong password"
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
                  Get Started <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-brand-muted text-sm font-sans">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-cyan hover:text-brand-cyan/80 font-semibold transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
