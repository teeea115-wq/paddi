'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Share, Users, Plus, Play, MapPin, Star, Loader2 } from 'lucide-react';

export default function RoomLobbyPage() {
  const { id } = useParams();
  const [room, setRoom] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const fetchCards = useCallback(async () => {
    const { data } = await supabase.from('cards').select('*').eq('room_id', id);
    setCards(data || []);
  }, [id]);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('room_members').select('*, users(email)').eq('room_id', id);
    setMembers(data || []);
  }, [id]);

  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    setSearching(true);
    try {
      const url = `/api/places?q=restaurant&lat=${lat}&lng=${lng}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setNearbyPlaces(data);
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to fetch nearby places');
    } finally {
      setSearching(false);
    }
  }, []);

  const initRoom = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', id).single();
    if (!roomData) {
      toast.error('Room not found');
      router.push('/dashboard');
      return;
    }
    setRoom(roomData);

    if (roomData.status === 'voting') {
      router.push(`/room/${id}/vote`);
      return;
    }

    const { data: member } = await supabase.from('room_members').select('*').eq('room_id', id).eq('user_id', user.id).single();
    if (!member) {
      await supabase.from('room_members').insert({ room_id: id, user_id: user.id });
    }

    fetchCards();
    fetchMembers();
    setLoading(false);

    if (roomData.mode === 'geo') {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchNearby(pos.coords.latitude, pos.coords.longitude),
        () => toast.error('Geolocation access denied')
      );
    }
  }, [id, router, fetchCards, fetchMembers, fetchNearby]);

  useEffect(() => {
    initRoom();
    
    const roomSub = supabase
      .channel(`room:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, 
        (payload) => {
          setRoom(payload.new);
          if (payload.new.status === 'voting') router.push(`/room/${id}/vote`);
        }
      )
      .subscribe();

    const cardsSub = supabase
      .channel(`cards:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cards', filter: `room_id=eq.${id}` },
        (payload) => setCards(prev => [...prev, payload.new])
      )
      .subscribe();

    const membersSub = supabase
      .channel(`members:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_members', filter: `room_id=eq.${id}` },
        fetchMembers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomSub);
      supabase.removeChannel(cardsSub);
      supabase.removeChannel(membersSub);
    };
  }, [id, initRoom, fetchMembers, router]);

  const addCard = async (title: string, placeId?: string, imageUrl?: string) => {
    if (!userId) return;

    const { data: canAdd, error: rpcError } = await supabase.rpc('check_card_limit', {
      p_room_id: id,
      p_user_id: userId
    });

    if (rpcError || !canAdd) {
      toast.error('Card limit reached!');
      return;
    }

    const { error } = await supabase.from('cards').insert({
      room_id: id,
      created_by: userId,
      title: title,
      place_id: placeId,
      image_url: imageUrl
    });

    if (error) toast.error(error.message);
    else {
      toast.success(`Added ${title}`);
      setNewCardTitle('');
    }
  };

  const shareLink = typeof window !== 'undefined' ? window.location.href : '';

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Info & Members */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border text-center">
            <h1 className="text-xl font-bold mb-4">Invite Friends</h1>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={shareLink} size={150} />
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                toast.success('Link copied!');
              }}
              className="flex items-center gap-2 justify-center w-full p-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Share size={18} /> Copy Link
            </button>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Users size={20} /> Members ({members.length})
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 animate-pulse rounded-lg" />)
              ) : members.length === 1 ? (
                <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div className="text-2xl mb-1">👥</div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">แชร์ลิงก์ให้เพื่อนเข้าร่วม</p>
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="p-2 bg-gray-50 rounded text-sm truncate flex items-center justify-between">
                    <span className="truncate">{m.users?.email}</span>
                    {m.user_id === room.host_id && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">HOST</span>}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Middle Column: Current Drafts */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col h-full min-h-[500px]">
            <h2 className="text-lg font-bold mb-4">Selected Options ({cards.length}/{room?.card_limit * members.length || '...'})</h2>
            
            <form onSubmit={(e) => { e.preventDefault(); addCard(newCardTitle); }} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Type an option..."
                className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
              />
              <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus size={20} />
              </button>
            </form>

            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
              {loading ? (
                [1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-xl" />)
              ) : cards.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <div className="text-4xl mb-2">🃏</div>
                  <p className="font-bold text-gray-800">ยังไม่มีตัวเลือก</p>
                  <p className="text-xs">เพิ่มคนแรกเลย!</p>
                </div>
              ) : (
                cards.map((card) => (
                  <div key={card.id} className="p-3 border rounded-xl flex items-center gap-3 bg-white hover:shadow-md transition-shadow">
                    {card.image_url ? (
                      <img src={card.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 font-bold uppercase">
                        {card.title[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{card.title}</p>
                      <p className="text-xs text-gray-400">Added by {members.find(m => m.user_id === card.created_by)?.users?.email?.split('@')[0] || 'Member'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {room?.host_id === userId && (
              <button
                onClick={async () => {
                  if (cards.length < 2) return toast.error('Add at least 2 cards');
                  await supabase.from('rooms').update({ status: 'voting' }).eq('id', id);
                }}
                className="mt-6 w-full bg-green-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all active:scale-95 disabled:bg-gray-300"
              >
                <Play size={20} /> Start Voting
              </button>
            )}
          </section>
        </div>

        {/* Right Column: Suggestions (Auto Geo Mode Only) */}
        <div className="space-y-6">
          {room?.mode === 'geo' && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border h-full min-h-[500px] flex flex-col">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-red-500" /> Nearby Suggestions
              </h2>
              
              {searching ? (
                <div className="flex-1 space-y-4 pr-2">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-gray-50 animate-pulse rounded-xl" />)}
                </div>
              ) : (
                <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                  {nearbyPlaces.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <div className="text-4xl mb-2">📍</div>
                      <p className="text-xs">No places found nearby.</p>
                    </div>
                  ) : (
                    nearbyPlaces.map((place, idx) => (
                      <div key={idx} className="group relative bg-gray-50 rounded-xl p-3 hover:bg-white border border-transparent hover:border-gray-200 transition-all">
                        <div className="flex gap-3">
                          <img src={place.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-200" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate">{place.title}</h3>
                            <div className="flex items-center gap-1 text-xs text-yellow-600 mb-1">
                              <Star size={12} fill="currentColor" /> {place.rating || 'N/A'}
                            </div>
                            <p className="text-[10px] text-gray-500 line-clamp-2">{place.address}</p>
                          </div>
                          <button
                            onClick={() => addCard(place.title, place.place_id, place.thumbnail)}
                            className="self-center p-2 bg-white rounded-full shadow-sm border hover:bg-blue-600 hover:text-white transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}
        </div>

      </div>
    </div>
  );
}
