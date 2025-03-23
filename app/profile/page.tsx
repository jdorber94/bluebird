'use client';

import { Suspense } from 'react';
import ProfileContent from '../components/ProfileContent';

export default function ProfilePage() {
  return (
    <div className="p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <ProfileContent isModal={false} />
      </Suspense>
    </div>
  );
} 