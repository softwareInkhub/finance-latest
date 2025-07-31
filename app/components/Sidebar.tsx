'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  RiDashboardLine, 
  RiBankLine, 
  RiPriceTag3Line,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiFileLine
} from 'react-icons/ri';

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: RiDashboardLine,
      description: 'Overview and analytics'
    },
    { 
      name: 'Banks', 
      path: '/banks', 
      icon: RiBankLine,
      description: 'Manage bank accounts'
    },
    { 
      name: 'Tags', 
      path: '/tags', 
      icon: RiPriceTag3Line,
      description: 'Organize with tags'
    },
    { 
      name: 'Files', 
      path: '/files', 
      icon: RiFileLine,
      description: 'Upload and manage files'
    },
  ];

  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div 
      className={`
        bg-white shadow-lg border-r border-gray-200 text-gray-900 h-[107vh] transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobile ? 'w-64' : ''}
      `}
    >
      {/* Header with Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BF</span>
            </div>
            {(!isCollapsed || isMobile) && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">Brmh Fintech</h1>
                <p className="text-xs text-gray-500">Financial Platform</p>
              </div>
            )}
          </div>
          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-gray-100 transition-colors duration-200"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? <RiMenuUnfoldLine size={20} /> : <RiMenuFoldLine size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleItemClick}
                className={`
                  flex items-center p-3 rounded-lg transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-100 text-blue-900 shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                  ${isCollapsed && !isMobile ? 'justify-center' : ''}
                `}
              >
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-lg mr-3
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-500 group-hover:text-blue-600'
                  }
                  ${isCollapsed && !isMobile ? 'mr-0' : ''}
                `}>
                  <Icon size={18} />
                </div>
                {(!isCollapsed || isMobile) && (
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500 truncate">{item.description}</div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
} 