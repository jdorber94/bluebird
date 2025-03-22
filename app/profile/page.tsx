'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import ProfileContent from '../components/ProfileContent';

// Loading component
function LoadingProfile() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error component
function ErrorProfile() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-lg font-medium text-red-600">Error loading profile</h2>
          <p className="mt-1 text-sm text-gray-500">Please try again later</p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

// Main profile component
export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingProfile />}>
      <ErrorBoundary fallback={<ErrorProfile />}>
        <ProfileContent />
      </ErrorBoundary>
    </Suspense>
  );
} 