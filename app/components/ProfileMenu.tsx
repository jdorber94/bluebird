'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ProfileMenuProps {
  isCollapsed?: boolean;
}

export default function ProfileMenu({ isCollapsed = false }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return;
    }
    router.push('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-2 hover:bg-gray-100 rounded-md w-full`}
      >
        <div className="w-8 h-8 rounded-full bg-gray-300"></div>
        {!isCollapsed && (
          <div className="text-left">
            <div className="text-sm font-medium">Yusuf Hilmi</div>
            <div className="text-xs text-gray-500">Demo Manager</div>
          </div>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${isCollapsed ? 'left-full ml-2' : 'bottom-full mb-2 left-0'} w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50`}>
          <div className="py-1">
            <a
              href="/profile"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              View Profile
            </a>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <svg className="mr-3 h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 