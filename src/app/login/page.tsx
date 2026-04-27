'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Globe } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (type: 'signin' | 'signup') => {
    setLoading(true);
    try {
      const { data, error } = type === 'signin' 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (error) throw error;
      if (data.user) await postLoginCheck(data.user.id);
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
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#0F0C29] overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/30 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <LogIn className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">DECISION MATCH</h1>
            <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-bold">Welcome Back</p>
          </div>

          <div className="space-y-4">
            {/* Input Fields */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Auth Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => handleAuth('signin')}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-2xl font-black text-lg hover:from-purple-500 hover:to-blue-500 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'SIGN IN'}
              </button>
              <button
                onClick={() => handleAuth('signup')}
                disabled={loading}
                className="w-full bg-white/10 text-white p-4 rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-[0.98]"
              >
                CREATE ACCOUNT
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6 flex items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-xs font-bold uppercase tracking-widest">Or continue with</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            {/* Social Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 p-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-[0.98]"
            >
              <Globe size={20} className="text-blue-600" />
              GOOGLE
            </button>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-500 text-xs mt-8 font-bold uppercase tracking-widest">
          &copy; 2026 Decision Match. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
