'use client';

import { Check, X, ChevronLeft, Zap, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for casual decision making.',
      features: [
        { name: '30-day trial', included: true },
        { name: '2 rooms per day', included: true },
        { name: 'Tinder-swipe UX', included: true },
        { name: 'SerpAPI suggestions', included: true },
        { name: 'Priority support', included: false },
        { name: 'Unlimited rooms', included: false },
      ]
    },
    {
      name: 'Premium',
      price: '$9.99',
      description: 'For power users and groups.',
      recommended: true,
      features: [
        { name: '30-day trial', included: true },
        { name: 'Unlimited rooms', included: true },
        { name: 'Tinder-swipe UX', included: true },
        { name: 'SerpAPI suggestions', included: true },
        { name: 'Priority support', included: true },
        { name: 'Advanced analytics', included: true },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-black mb-8 transition-colors"
        >
          <ChevronLeft size={20} /> Back
        </button>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-black italic tracking-tighter mb-4">CHOOSE YOUR PLAN</h1>
          <p className="text-gray-600">Upgrade to unlock unlimited decision making.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative bg-white rounded-3xl p-8 shadow-sm border ${plan.recommended ? 'ring-2 ring-blue-600 border-blue-600' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Zap size={14} fill="currentColor" /> Recommended
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-gray-500 text-sm mt-4">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3 text-sm">
                    {feature.included ? (
                      <Check size={18} className="text-green-500" />
                    ) : (
                      <X size={18} className="text-gray-300" />
                    )}
                    <span className={feature.included ? 'text-gray-800' : 'text-gray-400'}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="mailto:premium@decisionmatch.com?subject=Premium Upgrade Inquiry"
                className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl font-bold transition-all ${plan.recommended ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              >
                <Mail size={20} /> Contact Us to Upgrade
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
