'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, isLoading, requireAuth } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    // Check if we're already on the login page
    if (pathname.startsWith('/login-signup')) {
      return;
    }

    // Require authentication for all other pages
    requireAuth();
  }, [pathname, requireAuth]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on login page, don't render children
  if (!user && !pathname.startsWith('/login-signup')) {
    return null;
  }

  return <>{children}</>;
} 