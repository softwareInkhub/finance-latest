'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  RiMenuLine, 
  RiNotification3Line, 
  RiUserLine
} from 'react-icons/ri';
import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
  title?: string; // optional subtitle (shown after a slash)
  brandTitle?: string; // primary title to show (defaults to Brmh Fintech)
  brandIcon?: React.ReactNode; // optional icon to show before the brandTitle
}

export default function Navbar({ onMobileMenuToggle, title, brandTitle, brandIcon }: NavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
  };

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!showProfileMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (profileRef.current && target && !profileRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowProfileMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showProfileMenu]);

  return (
    <nav className="h-16 flex items-center px-4 md:px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm transition-all duration-300">
      {/* Mobile Menu Button */}
      <button 
        onClick={onMobileMenuToggle}
        className="md:hidden p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 focus:ring-2 focus:ring-purple-400 mr-3 transition-all duration-200 transform hover:scale-105 group"
        aria-label="Toggle mobile menu"
      >
        <RiMenuLine className="text-xl text-gray-600 dark:text-gray-300 group-hover:text-purple-600 transition-colors duration-200" />
      </button>
      
      {/* App Title */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {brandIcon && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
              {brandIcon}
            </span>
          )}
          <h1 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent drop-shadow-sm select-none">
            {brandTitle || 'Brmh Fintech'}
          </h1>
          {title && (
            <span className="text-sm md:text-base text-gray-500 dark:text-gray-400">/ {title}</span>
          )}
        </div>
      </div>
      
      {/* Right Side Controls */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Notifications */}
        <button 
          className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 focus:ring-2 focus:ring-purple-400 transition-all duration-200 relative group shadow-sm transform hover:scale-105"
          aria-label="Notifications"
        >
          <RiNotification3Line className="text-xl text-gray-600 dark:text-gray-300 group-hover:text-purple-600 transition-colors duration-200" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-md border-2 border-white dark:border-gray-900"></span>
        </button>
        
        {/* User Profile */}
        <div ref={profileRef} className="relative flex items-center gap-2">
          {/* User Email - Hidden on mobile */}
          {user?.email && (
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate max-w-[120px] hidden md:block" title={user.email}>
              {user.email}
            </span>
          )}
          
          {/* Profile Button */}
          <button
            className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 focus:ring-2 focus:ring-purple-400 transition-all duration-200 group shadow-sm transform hover:scale-105"
            onClick={() => setShowProfileMenu((v) => !v)}
            aria-label="User profile"
          >
            <RiUserLine className="text-xl text-gray-600 dark:text-gray-300 group-hover:text-purple-600 transition-colors duration-200" />
          </button>
          
          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg z-50 animate-scale-in">
              <div className="p-3">
                {/* User Info */}
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 mb-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{user?.email}</div>
                  <div className="text-xs">Premium Member</div>
                </div>
                
                {/* Menu Items */}
                <div className="space-y-1">
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200 text-sm">
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200 text-sm">
                    Account Settings
                  </button>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors duration-200 text-sm"
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 