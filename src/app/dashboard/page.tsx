'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { PlusCircle, Clock, CheckCircle2, Layout, AlertTriangle, Info, Zap } from 'lucide-react';
import PaywallModal from '@/components/PaywallModal';

export default function DashboardPage() {
  const { user, setUser } = useStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usageToday, setUsageToday] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      // Auto-open paywall if trial expired
      const trialStart = new Date(profile.trial_start_at);
      const trialDaysElapsed = Math.floor((new Date().getTime() - trialStart.getTime()) / (1000 * 3600 * 24));
      if (trialDaysElapsed >= 30 && !profile.is_premium) {
        setPaywallReason('trial_expired');
        setPaywallOpen(true);
      }
    }

    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*, room_members!inner(user_id)')
      .eq('room_members.user_id', authUser.id)
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
  };

  const handleCreateRoom = async () => {
    const res = await fetch('/api/check-access');
    const access = await res.json();

    if (!access.allowed) {
      setPaywallReason(access.reason);
      setPaywallOpen(true);
      return;
    }

    router.push('/room/create');
  };

  const trialDaysLeft = user?.trial_start_at 
    ? Math.max(0, 30 - Math.floor((new Date().getTime() - new Date(user.trial_start_at).getTime()) / (1000 * 3600 * 24)))
    : 0;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PaywallModal 
        isOpen={paywallOpen} 
        onClose={() => setPaywallOpen(false)} 
        reason={paywallReason} 
      />

      {/* Trial Banner */}
      {!user?.is_premium && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${trialDaysLeft < 7 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          {trialDaysLeft < 7 ? <AlertTriangle size={20} /> : <Info size={20} />}
          <div className="flex-1 text-sm font-medium">
            {trialDaysLeft <= 0 
              ? "Trial expired. Upgrade to Premium to continue." 
              : `คุณเหลือเวลาทดลองใช้ฟรีอีก ${trialDaysLeft} วัน`}
          </div>
          <button onClick={() => router.push('/pricing')} className="text-sm font-bold underline">Pricing</button>
        </div>
      )}

      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 truncate max-w-[200px]">{user?.email}</p>
        </div>
        <button
          onClick={handleCreateRoom}
          disabled={!user?.is_premium && trialDaysLeft <= 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <PlusCircle size={20} />
          Create Room
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
            <Clock size={14}/> Trial Status
          </h3>
          <p className="text-2xl font-bold mt-1">
            {user?.is_premium ? 'Premium Active' : `${trialDaysLeft} Days Remaining`}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
            <Zap size={14}/> Usage Today
          </h3>
          <p className="text-2xl font-bold mt-1">{usageToday} / 2 Rooms</p>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Rooms</h2>
        <div className="space-y-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => router.push(`/room/${room.id}`)}
              className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center cursor-pointer hover:border-blue-300 transition-colors"
            >
              <div>
                <p className="font-medium">Room: {room.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-500">{new Date(room.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {room.status === 'drafting' && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs flex items-center gap-1"><Layout size={12}/> Drafting</span>}
                {room.status === 'voting' && <span className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs flex items-center gap-1"><Clock size={12}/> Voting</span>}
                {room.status === 'completed' && <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle2 size={12}/> Completed</span>}
              </div>
            </div>
          ))}
          {rooms.length === 0 && <p className="text-gray-500 text-center py-8">No rooms yet. Create one to get started!</p>}
        </div>
      </section>
    </div>
  );
}
