'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Zap, Clock, ShieldAlert, Sparkles, Play } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'trial_expired' | 'quota_exceeded' | string;
}

export default function PaywallModal({ isOpen, onClose, reason }: PaywallModalProps) {
  if (!isOpen) return null;

  const isExpired = reason === 'trial_expired';

  const handleUpgradeClick = () => {
    toast('Coming Soon! ระบบชำระเงินกำลังพัฒนา กรุณาติดต่อ admin', {
      icon: '🚀',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-[#1a1a2e] border border-white/10 rounded-[2.5rem] max-w-md w-full overflow-hidden shadow-2xl shadow-purple-500/20"
        >
          <div className={`p-8 text-center ${isExpired ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl ${isExpired ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
              {isExpired ? <ShieldAlert size={40} /> : <Zap size={40} />}
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white">
              {isExpired ? 'TRIAL EXPIRED' : 'DAILY LIMIT'}
            </h2>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed px-4">
              {isExpired 
                ? "Your 30-day decision trial has come to an end. Join our Premium members to keep deciding with friends!" 
                : "You've used your 2 free rooms for today. Free users have a 2-room daily limit. Upgrade for unlimited rooms!"
              }
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                <Sparkles size={18} className="text-purple-400" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Unlimited room creation</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                <Clock size={18} className="text-blue-400" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Lifetime access</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleUpgradeClick}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:from-purple-500 hover:to-blue-500 transition-all active:scale-95 shadow-lg shadow-purple-500/20"
              >
                UPGRADE TO PREMIUM
              </button>
              
              {!isExpired && (
                <button
                  onClick={onClose}
                  className="w-full bg-white/5 text-gray-400 p-5 rounded-2xl font-bold hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Play size={18} />
                  ใช้งานต่อ (TRIAL)
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
