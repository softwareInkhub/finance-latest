'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  userId: string;
  email: string;
  name?: string;
}

export function useAuth() {
  // Initialize user state from localStorage to prevent initial flash
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId');
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (userId && isLoggedIn === 'true') {
        return { userId, email: '', name: '' }; // Set initial state to prevent flash
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const userId = localStorage.getItem('userId');
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      
      if (!userId || !isLoggedIn || isLoggedIn !== 'true') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Check if we need to fetch user details
      if (!user || !user.email) {
        fetch(`/api/users?id=${userId}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.email) {
              setUser({
                userId,
                email: data.email,
                name: data.name
              });
            } else {
              setUser(null);
            }
          })
          .catch(() => {
            setUser(null);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userId' || e.key === 'isLoggedIn') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]); // user dependency is needed since we check user.email

  const login = (userData: User) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userId', userData.userId);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    setUser(null);
    router.push('/login-signup');
  };

  const requireAuth = () => {
    if (!isLoading && !user) {
      router.push('/login-signup');
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    requireAuth
  };
} 