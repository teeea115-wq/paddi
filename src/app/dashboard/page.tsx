'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  Layout, 
  AlertTriangle, 
  Zap, 
  Users, 
  Calendar,
  ChevronRight,
  Loader2,
  Sparkles
} from 'lucide-react';
import PaywallModal from '@/components/PaywallModal';

export default function DashboardPage() {
  const { user, setUser } = useStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usageToday, setUsageToday] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profile) {
      setUser(profile);
      if (profile.trial_start_at) {
        const trialStart = new Date(profile.trial_start_at);
        const trialDaysElapsed = Math.floor((new Date().getTime() - trialStart.getTime()) / (1000 * 3600 * 24));
        if (trialDaysElapsed >= 30 && !profile.is_premium) {
          setPaywallReason('trial_expired');
          setPaywallOpen(true);
        }
      }
    }

    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*, room_members(count)')
      .order('created_at', { ascending: false });

    setRooms(roomsData || []);

    const { data: usageCount } = await supabase
      .from('usage_log')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('action', 'create_room')
      .eq('date', new Date().toISOString().split('T')[0]);

    setUsageToday(usageCount?.length || 0);
    setLoading(false);
  }, [router, setUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/check-access');
      const access = await res.json();

      if (!access.allowed) {
        setPaywallReason(access.reason);
        setPaywallOpen(true);
        return;
      }

      router.push('/room/create');
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const trialDaysLeft = user?.trial_start_at 
    ? Math.max(0, 30 - Math.floor((new Date().getTime() - new Date(user.trial_start_at).getTime()) / (1000 * 3600 * 24)))
    : 30;

  if (loading && rooms.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F0E17] flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0E17] text-white font-sans pb-24 lg:pb-12">
      <PaywallModal 
        isOpen={paywallOpen} 
        onClose={() => setPaywallOpen(false)} 
        reason={paywallReason} 
      />

      <div className="max-w-5xl mx-auto p-6 lg:p-12">
        {/* Top Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-black italic tracking-tighter mb-2 flex items-center gap-2">
              สวัสดี {user?.email?.split('@')[0]} 👋
            </h1>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">ยินดีต้อนรับกลับสู่ Decision Match</p>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateRoom}
            className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-purple-900/20"
          >
            <PlusCircle size={24} />
            สร้างห้องใหม่
          </motion.button>
        </header>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar size={80} />
            </div>
            <h3 className="text-gray-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 mb-4">
              <Clock size={14} className="text-purple-400" /> Trial Status
            </h3>
            <p className="text-3xl font-black italic tracking-tighter">
              {user?.is_premium ? 'PREMIUM UNLIMITED' : `${trialDaysLeft} DAYS REMAINING`}
            </p>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500" 
                style={{ width: `${(trialDaysLeft / 30) * 100}%` }}
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles size={80} />
            </div>
            <h3 className="text-gray-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 mb-4">
              <Zap size={14} className="text-blue-400" /> Usage Today
            </h3>
            <p className="text-3xl font-black italic tracking-tighter">
              {usageToday} / 2 ROOMS USED
            </p>
            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Reset in 12 hours</p>
          </motion.div>
        </div>

        {/* Room List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-2">
              <Layout className="text-purple-500" /> ห้องของคุณ
            </h2>
            <span className="text-[10px] bg-white/5 px-3 py-1 rounded-full font-bold text-gray-400 uppercase tracking-widest">
              Total: {rooms.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {rooms.map((room, idx) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => router.push(`/room/${room.id}`)}
                className="group bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 hover:border-white/20 p-5 rounded-3xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                    room.status === 'drafting' ? 'bg-blue-500/20 text-blue-400' :
                    room.status === 'voting' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    <Layout size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-tight">Room: {room.id.slice(0, 8)}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Calendar size={10} /> {new Date(room.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Users size={10} /> {room.room_members?.[0]?.count || 1} members
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                    room.status === 'drafting' ? 'bg-blue-500 text-white shadow-lg shadow-blue-900/40' :
                    room.status === 'voting' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' :
                    'bg-green-500 text-white shadow-lg shadow-green-900/40'
                  }`}>
                    {room.status === 'voting' && <Loader2 size={10} className="animate-spin" />}
                    {room.status}
                  </div>
                  <ChevronRight size={20} className="text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}

            {rooms.length === 0 && !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 bg-white/2 rounded-[3rem] border border-dashed border-white/10"
              >
                <div className="text-5xl mb-4">🃏</div>
                <p className="text-xl font-bold text-gray-300">ยังไม่มีห้อง</p>
                <p className="text-sm text-gray-500 mt-1">กดปุ่มสีม่วงด้านบนเพื่อสร้างห้องแรก!</p>
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
