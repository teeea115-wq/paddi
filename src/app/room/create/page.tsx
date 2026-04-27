'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { MapPin, MousePointer2, ArrowRight, ArrowLeft } from 'lucide-react';

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

      toast.success('Room created!');
      router.push(`/room/${room.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl border">
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-1/3 h-1 rounded-full mx-1 ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Pick Room Mode</h2>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => { setMode('geo'); setStep(2); }}
                className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${mode === 'geo' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <MapPin className="text-blue-600" size={32} />
                <span className="font-semibold">Auto Nearby</span>
                <span className="text-sm text-gray-500">Discover places automatically</span>
              </button>
              <button
                onClick={() => { setMode('manual'); setStep(2); }}
                className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${mode === 'manual' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <MousePointer2 className="text-purple-600" size={32} />
                <span className="font-semibold">Manual Entry</span>
                <span className="text-sm text-gray-500">Add options yourself</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Set Card Limit</h2>
            <p className="text-gray-500">How many options can each person add?</p>
            <div className="space-y-4">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={cardLimit}
                onChange={(e) => setCardLimit(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xl font-bold text-blue-600">
                <span>1</span>
                <span>{cardLimit}</span>
                <span>5</span>
              </div>
              <button
                onClick={() => setStep(mode === 'geo' ? 3 : 3)} // Both go to step 3, but step 3 content differs
                className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                Next <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{mode === 'geo' ? 'Set Search Radius' : 'Ready to Start?'}</h2>
            {mode === 'geo' ? (
              <div className="space-y-4">
                <p className="text-gray-500">How far should we look? (m)</p>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="500"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between font-bold text-blue-600">
                  <span>500m</span>
                  <span>{radius}m</span>
                  <span>5km</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">You'll be able to manually add cards in the next step.</p>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border p-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] bg-blue-600 text-white p-3 rounded-xl font-bold disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
