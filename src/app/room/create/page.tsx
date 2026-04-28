'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, MousePointer2, ArrowRight, ArrowLeft, Loader2, Sparkles, Layout, CheckCircle2 } from 'lucide-react';

export default function CreateRoomPage() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'geo' | 'manual'>('manual');
  const [cardLimit, setCardLimit] = useState(3);
  const [radius, setRadius] = useState(1000);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Create Room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          host_id: user.id,
          mode,
          card_limit: cardLimit,
          radius_m: mode === 'geo' ? radius : null,
          status: 'drafting'
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Add Host as Member
      await supabase.from('room_members').insert({
        room_id: room.id,
        user_id: user.id
      });

      // 3. Log Usage
      await supabase.from('usage_log').insert({
        user_id: user.id,
        action: 'create_room'
      });

      toast.success('Room created successfully!');
      router.push(`/room/${room.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0E17] text-white flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
      >
        {/* Progress Bar */}
        <div className="flex h-1.5 w-full bg-white/5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-full transition-all duration-500 ${s <= step ? 'bg-gradient-to-r from-purple-500 to-blue-500 w-1/3' : 'w-0'}`}
            />
          ))}
        </div>

        <div className="p-8 lg:p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} />
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">SELECT MODE</h2>
                  <p className="text-gray-400 text-sm mt-2 font-bold uppercase tracking-widest">How do you want to pick?</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => { setMode('geo'); setStep(2); }}
                    className={`group p-6 border-2 rounded-[2rem] flex items-center gap-6 transition-all ${mode === 'geo' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${mode === 'geo' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400'}`}>
                      <MapPin size={28} />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-lg italic tracking-tight">AUTO NEARBY</span>
                      <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider">Discover places automatically</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { setMode('manual'); setStep(2); }}
                    className={`group p-6 border-2 rounded-[2rem] flex items-center gap-6 transition-all ${mode === 'manual' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${mode === 'manual' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}>
                      <MousePointer2 size={28} />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-lg italic tracking-tight">MANUAL ENTRY</span>
                      <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider">Add options yourself</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Layout size={32} />
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">CARD LIMIT</h2>
                  <p className="text-gray-400 text-sm mt-2 font-bold uppercase tracking-widest">Options per member</p>
                </div>

                <div className="space-y-12 py-8">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={cardLimit}
                    onChange={(e) => setCardLimit(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between items-center px-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <div key={val} className="flex flex-col items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cardLimit >= val ? 'bg-purple-500' : 'bg-white/10'}`} />
                        <span className={`text-sm font-black ${cardLimit === val ? 'text-purple-400 scale-125' : 'text-gray-600'} transition-all`}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 bg-white/5 p-5 rounded-2xl font-bold text-gray-400 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <ArrowLeft size={20} /> BACK
                  </button>
                  <button onClick={() => setStep(3)} className="flex-[2] bg-gradient-to-r from-purple-600 to-blue-600 p-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-purple-900/20 transition-all active:scale-95">
                    NEXT <ArrowRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">{mode === 'geo' ? 'RADIUS' : 'READY?'}</h2>
                  <p className="text-gray-400 text-sm mt-2 font-bold uppercase tracking-widest">
                    {mode === 'geo' ? 'How far should we look?' : 'Finalize your room setup'}
                  </p>
                </div>

                {mode === 'geo' && (
                  <div className="space-y-10 py-4">
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="500"
                      value={radius}
                      onChange={(e) => setRadius(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      <span>500M</span>
                      <span className="text-green-400 text-lg italic tracking-tight">{radius/1000}KM</span>
                      <span>5KM</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 bg-white/5 p-5 rounded-2xl font-bold text-gray-400 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <ArrowLeft size={20} /> BACK
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-600 p-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'CREATE ROOM'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
