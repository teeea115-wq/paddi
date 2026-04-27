'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Star, MapPin, Heart, X, ChevronLeft, Loader2 } from 'lucide-react';

export default function ResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);

  const fetchResults = useCallback(async () => {
    // 1. Fetch Room and Cards
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', id).single();
    const { data: cardsData } = await supabase.from('cards').select('*').eq('room_id', id);
    const { data: votesData } = await supabase.from('votes').select('*').eq('room_id', id);

    if (!roomData || !cardsData) return;
    setRoom(roomData);

    // 2. Aggregate Scores
    const scoredCards = cardsData.map(card => {
      const cardVotes = votesData?.filter(v => v.card_id === card.id) || [];
      const likes = cardVotes.filter(v => v.value === 'like').length;
      const dislikes = cardVotes.filter(v => v.value === 'dislike').length;
      return {
        ...card,
        likes,
        dislikes,
        score: likes - dislikes
      };
    });

    // 3. Sort Descending
    scoredCards.sort((a, b) => b.score - a.score);
    setResults(scoredCards);

    // 4. Mark completed if not already
    if (roomData.status !== 'completed') {
      await supabase.from('rooms').update({ status: 'completed' }).eq('id', id);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        <header className="mb-8 flex items-center justify-between">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-black italic tracking-tighter">RESULTS</h1>
          <div className="w-10" /> {/* Spacer */}
        </header>

        <div className="space-y-4">
          {results.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${idx === 0 ? 'ring-2 ring-yellow-400 border-yellow-400' : ''}`}
            >
              {idx === 0 && (
                <div className="absolute -top-3 -left-3 bg-yellow-400 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                  <Trophy size={12} /> Winner
                </div>
              )}

              <div 
                className="w-20 h-20 rounded-xl bg-gray-100 shrink-0 overflow-hidden"
                style={{ backgroundImage: `url(${card.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                {!card.image_url && <div className="flex items-center justify-center h-full text-2xl">🍽️</div>}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg truncate">{card.title}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                    <Heart size={14} fill="currentColor" /> {card.likes}
                  </div>
                  <div className="flex items-center gap-1 text-red-500 text-sm font-bold">
                    <X size={14} /> {card.dislikes}
                  </div>
                  {card.rating && (
                    <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold ml-auto">
                      <Star size={12} fill="currentColor" /> {card.rating}
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-xs truncate mt-2 flex items-center gap-1">
                  <MapPin size={12} /> {card.address || 'Manual Entry'}
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-gray-800 leading-none">#{idx + 1}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Score: {card.score}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-black text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
