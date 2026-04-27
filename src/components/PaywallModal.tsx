'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, Zap, Clock, ShieldAlert } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'trial_expired' | 'quota_exceeded' | string;
}

export default function PaywallModal({ isOpen, onClose, reason }: PaywallModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const isExpired = reason === 'trial_expired';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white rounded-[2rem] max-w-md w-full overflow-hidden shadow-2xl"
        >
          <div className={`p-8 text-center ${isExpired ? 'bg-red-50' : 'bg-blue-50'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isExpired ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {isExpired ? <ShieldAlert size={32} /> : <Zap size={32} />}
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter">
              {isExpired ? 'TRIAL EXPIRED' : 'QUOTA EXCEEDED'}
            </h2>
            <p className="text-gray-600 mt-2">
              {isExpired 
                ? "Your 30-day trial has come to an end. Join our Premium members to keep making decisions together!" 
                : "You've reached the daily limit for free users (2 rooms/day). Upgrade to Premium for unlimited access!"
              }
            </p>
          </div>

          <div className="p-8 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Lock size={16} className="text-gray-400" />
                <span>Unlimited room creation</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock size={16} className="text-gray-400" />
                <span>Extended trial forever</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Zap size={16} className="text-gray-400" />
                <span>Priority location search (SerpAPI)</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <button
                onClick={() => router.push('/pricing')}
                className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-transform active:scale-95"
              >
                Upgrade to Premium
              </button>
              {!isExpired && (
                <button
                  onClick={onClose}
                  className="w-full bg-gray-100 text-gray-600 p-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Maybe Later
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
