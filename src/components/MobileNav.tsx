'use client';

import { motion } from 'framer-motion';
import { Home, Layers, User, PlusCircle } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: PlusCircle, label: 'Create', path: '/room/create' },
    { icon: User, label: 'Profile', path: '/dashboard' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center lg:hidden z-50 pb-safe">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.label}
            onClick={() => router.push(item.path)}
            className="flex flex-col items-center gap-1"
          >
            <item.icon 
              size={24} 
              className={isActive ? 'text-blue-600' : 'text-gray-400'} 
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
              {item.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="nav-active"
                className="w-1 h-1 bg-blue-600 rounded-full mt-0.5"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
