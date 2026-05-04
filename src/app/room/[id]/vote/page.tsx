'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart, X, Star, MapPin, Trophy, Loader2, CheckCircle2 } from 'lucide-react';

export default function VotePage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [room, setRoom] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [votedCardIds, setVotedCardIds] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<any[]>([]);
  const [memberVotes, setMemberVotes] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchedCard, setMatchedCard] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Motion values for the top card
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const dislikeOpacity = useTransform(x, [-150, -50], [1, 0]);

  const fetchVotes = useCallback(async () => {
    const { data } = await supabase.from('votes').select('*').eq('room_id', id);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(v => {
        counts[v.user_id] = (counts[v.user_id] || 0) + 1;
      });
      setMemberVotes(counts);
    }
  }, [id]);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUserId(user.id);

    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', id).single();
    if (!roomData || roomData.status !== 'voting') {
      if (roomData?.status === 'completed') return router.push(`/room/${id}/results`);
      return router.push(`/room/${id}`);
    }
    setRoom(roomData);

    const { data: cardsData } = await supabase.from('cards').select('*').eq('room_id', id);
    const { data: myVotes } = await supabase.from('votes').select('card_id').eq('room_id', id).eq('user_id', user.id);
    const votedIds = new Set(myVotes?.map(v => v.card_id) || []);
    
    setCards(cardsData || []);
    setVotedCardIds(votedIds);
    
    // Find first unvoted card
    const firstUnvoted = cardsData?.findIndex(c => !votedIds.has(c.id)) ?? -1;
    setCurrentIndex(firstUnvoted === -1 ? (cardsData?.length || 0) : firstUnvoted);

    const { data: membersData } = await supabase.from('room_members').select('*, users(email)').eq('room_id', id);
    setMembers(membersData || []);

    fetchVotes();
    setLoading(false);
  }, [id, router, fetchVotes]);

  useEffect(() => {
    init();

    const votesSub = supabase
      .channel(`votes:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes', filter: `room_id=eq.${id}` }, fetchVotes)
      .subscribe();

    const roomSub = supabase
      .channel(`room_status:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, 
        (payload) => {
          if (payload.new.status === 'completed' && !matchedCard) {
            router.push(`/room/${id}/results`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(votesSub);
      supabase.removeChannel(roomSub);
    };
  }, [id, init, fetchVotes, matchedCard, router]);

  const handleVote = async (cardId: string, value: 'like' | 'dislike') => {
    if (!userId) return;

    const { error } = await supabase.from('votes').insert({
      room_id: id,
      card_id: cardId,
      user_id: userId,
      value
    });

    if (error) {
      if (error.code !== '23505') toast.error(error.message); // Ignore duplicate votes
      return;
    }

    if (value === 'like') {
      const { data: isMatch } = await supabase.rpc('check_match', { p_room_id: id, p_card_id: cardId });
      if (isMatch) {
        const card = cards.find(c => c.id === cardId);
        setMatchedCard(card);
        await supabase.from('rooms').update({ status: 'completed' }).eq('id', id);
        return;
      }
    }

    setVotedCardIds(prev => new Set(prev).add(cardId));
    setCurrentIndex(prev => prev + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex >= cards.length || matchedCard) return;
      if (e.key === 'ArrowRight') handleVote(cards[currentIndex].id, 'like');
      if (e.key === 'ArrowLeft') handleVote(cards[currentIndex].id, 'dislike');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards, matchedCard]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

  const remaining = cards.length - currentIndex;
  const isFinished = currentIndex >= cards.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 overflow-hidden">
      
      {/* Progress Header */}
      <div className="w-full max-w-md mb-8 space-y-4">
        <div className="flex justify-center">
          <div className="bg-white px-4 py-1 rounded-full shadow-sm border text-sm font-bold text-blue-600">
            {isFinished ? 'Finished!' : `เหลืออีก ${remaining} ใบ`}
          </div>
        </div>
        <div className="flex justify-center gap-2 overflow-x-auto py-2">
          {members.map(m => {
            const hasFinished = (memberVotes[m.user_id] || 0) >= cards.length;
            return (
              <div key={m.id} className="relative group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${hasFinished ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                  {m.users?.email[0].toUpperCase()}
                  {hasFinished && <CheckCircle2 size={12} className="absolute -top-1 -right-1 bg-white rounded-full text-green-500" />}
                </div>
                <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
                  {m.users?.email}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-sm aspect-[3/4] mb-8">
        <AnimatePresence>
          {!isFinished && !matchedCard && (
            cards.slice(currentIndex, currentIndex + 3).reverse().map((card, idx, arr) => {
              const isTop = idx === arr.length - 1;
              return (
                <motion.div
                  key={card.id}
                  style={isTop ? { x, rotate, opacity } : {}}
                  drag={isTop ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100) handleVote(card.id, 'like');
                    else if (info.offset.x < -100) handleVote(card.id, 'dislike');
                  }}
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ 
                    scale: 0.9 + (idx * 0.05), 
                    opacity: 1, 
                    y: (arr.length - 1 - idx) * -10,
                    zIndex: idx
                  }}
                  exit={{ 
                    x: x.get() > 0 ? 500 : -500, 
                    rotate: x.get() > 0 ? 15 : -15, 
                    opacity: 0 
                  }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="absolute inset-0 bg-white rounded-3xl shadow-xl border overflow-hidden cursor-grab active:cursor-grabbing touch-none"
                >
                  {/* Card Content */}
                  <div 
                    className="h-2/3 bg-gray-200 relative"
                    style={{ 
                      backgroundImage: card.image_url ? `url(${card.image_url})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {!card.image_url && <div className="absolute inset-0 flex items-center justify-center text-6xl">🍽️</div>}
                    
                    {/* Swipe Overlays */}
                    {isTop && (
                      <>
                        <motion.div style={{ opacity: likeOpacity }} className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <div className="border-4 border-green-500 text-green-500 font-black text-4xl px-4 py-2 rounded-xl rotate-[-15deg]">LIKE</div>
                        </motion.div>
                        <motion.div style={{ opacity: dislikeOpacity }} className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                          <div className="border-4 border-red-500 text-red-500 font-black text-4xl px-4 py-2 rounded-xl rotate-[15deg]">NOPE</div>
                        </motion.div>
                      </>
                    )}
                  </div>

                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-1 truncate">{card.title}</h2>
                    {card.rating && (
                      <div className="flex items-center gap-1 text-yellow-500 text-sm mb-2 font-bold">
                        <Star size={14} fill="currentColor" /> {card.rating}
                      </div>
                    )}
                    <p className="text-gray-500 text-sm line-clamp-2 flex items-start gap-1">
                      <MapPin size={14} className="shrink-0 mt-0.5" /> {card.address || 'Manual Entry'}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {isFinished && !matchedCard && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border shadow-sm"
          >
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-xl font-bold mb-2">Voted all cards!</h2>
            <p className="text-gray-500 mb-6 text-sm">Waiting for other members to finish...</p>
            <button
              onClick={() => router.push(`/room/${id}/results`)}
              className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              See Partial Results
            </button>
          </motion.div>
        )}
      </div>

      {/* Control Buttons */}
      {!isFinished && !matchedCard && (
        <div className="flex gap-8 mt-4">
          <button 
            onClick={() => handleVote(cards[currentIndex].id, 'dislike')}
            className="w-16 h-16 bg-white rounded-full shadow-lg border-2 border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors active:scale-90"
          >
            <X size={32} />
          </button>
          <button 
            onClick={() => handleVote(cards[currentIndex].id, 'like')}
            className="w-16 h-16 bg-white rounded-full shadow-lg border-2 border-green-100 flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors active:scale-90"
          >
            <Heart size={32} fill="currentColor" />
          </button>
        </div>
      )}

      {/* MATCH Overlay */}
      <AnimatePresence>
        {matchedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
              className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden text-center shadow-2xl"
            >
              <div className="bg-yellow-400 p-8">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Trophy size={80} className="mx-auto text-white drop-shadow-lg" />
                </motion.div>
                <h1 className="text-5xl font-black text-white italic mt-4 tracking-tighter drop-shadow-md">MATCH!</h1>
              </div>
              
              <div className="p-8">
                <div 
                  className="w-32 h-32 mx-auto rounded-2xl bg-gray-100 mb-6 shadow-lg border-4 border-white"
                  style={{ backgroundImage: `url(${matchedCard.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  {!matchedCard.image_url && <div className="flex items-center justify-center h-full text-4xl">🍽️</div>}
                </div>
                <h2 className="text-3xl font-bold mb-2">{matchedCard.title}</h2>
                <p className="text-gray-500 text-sm mb-8">{matchedCard.address}</p>
                
                <button
                  onClick={() => router.push(`/room/${id}/results`)}
                  className="w-full bg-black text-white p-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-colors"
                >
                  ดูผลทั้งหมด
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
