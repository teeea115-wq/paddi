'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, Globe, User, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const router = useRouter();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (mode === 'signup') {
      if (!fullName) newErrors.fullName = 'Full Name is required';
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await postLoginCheck(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) throw error;
        if (data.user) {
          toast.success('Registration successful! Please check your email for verification.');
          setMode('signin');
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) toast.error(error.message);
  };

  const postLoginCheck = async (userId: string) => {
    const { data: profile } = await supabase
      .from('users')
      .select('trial_start_at')
      .eq('id', userId)
      .single();

    if (profile && !profile.trial_start_at) {
      await supabase
        .from('users')
        .update({ trial_start_at: new Date().toISOString() })
        .eq('id', userId);
    }
    router.push('/dashboard');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#0F0C29] overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/40 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/40 rounded-full blur-[120px] animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <Globe className="text-white" size={32} />
            </motion.div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">DECISION MATCH</h1>
            
            <div className="flex bg-white/5 p-1 rounded-xl mt-6 w-fit mx-auto border border-white/10">
              <button 
                onClick={() => { setMode('signin'); setErrors({}); }}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'signin' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                SIGN IN
              </button>
              <button 
                onClick={() => { setMode('signup'); setErrors({}); }}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'signup' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                SIGN UP
              </button>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      placeholder="Full Name"
                      className={`w-full bg-white/5 border ${errors.fullName ? 'border-red-500' : 'border-white/10'} rounded-2xl p-4 pl-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none transition-all`}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    {errors.fullName && <p className="text-red-500 text-[10px] mt-1 ml-4 font-bold uppercase">{errors.fullName}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                className={`w-full bg-white/5 border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-2xl p-4 pl-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none transition-all`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-4 font-bold uppercase">{errors.email}</p>}
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={`w-full bg-white/5 border ${errors.password ? 'border-red-500' : 'border-white/10'} rounded-2xl p-4 pl-12 pr-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none transition-all`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-4 font-bold uppercase">{errors.password}</p>}
            </div>

            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      className={`w-full bg-white/5 border ${errors.confirmPassword ? 'border-red-500' : 'border-white/10'} rounded-2xl p-4 pl-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none transition-all`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-[10px] mt-1 ml-4 font-bold uppercase">{errors.confirmPassword}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-2xl font-black text-lg hover:from-purple-500 hover:to-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-purple-900/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
              {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8 flex items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Social Connect</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Social Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 p-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-[0.98] shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.9 0 3.51.68 4.67 1.81l3.5-3.5C17.91 1.24 15.21 0 12 0 7.33 0 3.3 2.67 1.24 6.57l4.08 3.17c.97-2.91 3.75-5.04 6.68-5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.89 3c2.28-2.09 3.53-5.2 3.53-8.82z" />
              <path fill="#FBBC05" d="M5.32 14.26c-.24-.72-.38-1.49-.38-2.26 0-.77.14-1.54.38-2.26L1.24 6.57C.45 8.18 0 9.98 0 12s.45 3.82 1.24 5.43l4.08-3.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.89-3c-1.11.75-2.53 1.19-4.04 1.19-2.93 0-5.41-1.98-6.3-4.66l-4.08 3.17C3.3 21.33 7.33 24 12 24z" />
            </svg>
            CONTINUE WITH GOOGLE
          </button>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-500 text-[10px] mt-8 font-bold uppercase tracking-[0.3em]">
          &copy; 2026 Decision Match. Ready for launch.
        </p>
      </motion.div>
    </div>
  );
}
