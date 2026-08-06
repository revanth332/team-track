import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, User, Key, AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isRegistering) {
        await authService.register({
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          username: username.trim().toLowerCase(),
          email: `${username.trim().toLowerCase()}@miraclesoft.com`,
          password
        });
        setSuccess('Registration successful! Please sign in to continue.');
        setIsRegistering(false);
        setPassword('');
      } else {
        const response = await authService.login({ 
          username: username.trim().toLowerCase(), 
          password 
        });
        login(response.access_token);
        onLogin();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.response?.status === 401) {
        setError(isRegistering 
          ? 'Registration failed. This account may already exist or provided details are invalid.' 
          : 'Invalid username or password. Please check your credentials and try again.');
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || err.message || `An error occurred during ${isRegistering ? 'registration' : 'sign in'}.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary/20">
            {isRegistering ? <UserPlus size={24} /> : <ShieldCheck size={24} />}
          </div>
          <h1 className="text-xl font-bold text-on-surface tracking-tight">Team Management</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {isRegistering ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-error/5 border border-error/10 rounded-2xl flex items-center gap-3 text-error"
          >
            <AlertCircle size={18} />
            <p className="text-xs font-bold leading-tight">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-success/5 border border-success/10 rounded-2xl flex items-center gap-3 text-success"
          >
            <CheckCircle2 size={18} />
            <p className="text-xs font-bold leading-tight">{success}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {isRegistering && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">First Name</label>
                    <input 
                      type="text" 
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium placeholder:text-on-surface-variant/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Last Name</label>
                    <input 
                      type="text" 
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium placeholder:text-on-surface-variant/30"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Username</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium placeholder:text-on-surface-variant/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Password</label>
            <div className="relative group">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium placeholder:text-on-surface-variant/30"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full primary-gradient text-on-primary py-3.5 rounded-2xl font-bold text-sm shadow-md shadow-primary/10 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100 mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isRegistering ? 'Sign Up' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
              setSuccess(null);
            }}
            className="text-xs font-bold text-primary hover:underline transition-all"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
