'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { 
  RiMenuLine, 
  RiNotification3Line, 
  RiUserLine
} from 'react-icons/ri';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetch(`/api/users?id=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.email) setUserEmail(data.email);
        })
        .catch(() => setUserEmail(null));
    }
  }, []);

  const handleSidebarItemClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setShowProfileMenu(false);
    router.push('/login-signup');
  };

  return (
    <>
      <nav className="h-16 flex items-center px-4 md:px-6 bg-white/60 backdrop-blur-xl border-b border-blue-100 transition-all duration-300">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2  hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 mr-2 transition-all duration-200 border border-transparent focus:border-blue-400 shadow-sm"
        >
          <RiMenuLine className="text-xl text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent drop-shadow-lg select-none">
            Brmh Fintech
          </h1>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <button className="p-2 rounded-full hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 transition-colors duration-200 relative group shadow-sm">
            <RiNotification3Line className="text-xl text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-md border-2 border-white"></span>
          </button>
          <div className="relative flex items-center gap-2">
            {userEmail && (
              <span className="text-sm text-gray-700 font-medium truncate max-w-[120px]" title={userEmail}>{userEmail}</span>
            )}
            <button
              className="p-2 rounded-full hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 transition-colors duration-200 group shadow-sm"
              onClick={() => setShowProfileMenu((v) => !v)}
            >
              <RiUserLine className="text-xl text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-50">
                <button
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-red-600 font-semibold rounded"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-in-out">
            <Sidebar onItemClick={handleSidebarItemClick} />
          </div>
        </div>
      )}
    </>
  );
} 