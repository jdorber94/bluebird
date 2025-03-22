'use client';

import { Fragment, useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Modal from './Modal';
import ProfileContent from './ProfileContent';

interface ProfileMenuProps {
  isCollapsed?: boolean;
}

interface Profile {
  full_name: string;
  role: string;
}

export default function ProfileMenu({ isCollapsed = false }: ProfileMenuProps) {
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitial = () => {
    if (loading) return '...';
    if (!profile?.full_name) return '?';
    return profile.full_name.charAt(0).toUpperCase();
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  return (
    <>
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button
            onClick={handleProfileClick}
            className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10' : 'space-x-3 px-4 py-2'} hover:bg-gray-100 rounded-md`}
          >
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
              {getInitial()}
            </div>
            {!isCollapsed && (
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {loading ? 'Loading...' : profile?.full_name || 'Set up your profile'}
                </div>
                <div className="text-xs text-gray-500">{profile?.role || 'Demo Manager'}</div>
              </div>
            )}
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className={`absolute ${isCollapsed ? 'left-full ml-2' : 'right-0'} mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
            <div className="px-1 py-1">
              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    onClick={handleProfileClick}
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                  >
                    View Profile
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }: { active: boolean }) => (
                  <button
                    onClick={handleSignOut}
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm text-gray-900`}
                  >
                    Sign Out
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Profile"
      >
        <ProfileContent isModal={true} onClose={() => setIsProfileModalOpen(false)} />
      </Modal>
    </>
  );
} 