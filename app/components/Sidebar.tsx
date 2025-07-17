'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  RiDashboardLine, 
  RiBankLine, 
  RiPriceTag3Line,
  RiMenuFoldLine,
  RiMenuUnfoldLine
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
    { name: 'Dashboard', path: '/dashboard', icon: RiDashboardLine },
    { name: 'Banks', path: '/banks', icon: RiBankLine },
    { name: 'Tags', path: '/tags', icon: RiPriceTag3Line },
    { name: 'File Converter', path: '/convert-file', icon: RiPriceTag3Line },
  ];

  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div 
      className={`
        bg-white/60 backdrop-blur-2xl border-r border-blue-100 text-gray-900 h-screen transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobile ? 'w-64' : ''}
         
      `}
    >
      <div className="p-3 flex justify-between items-center border-b border-blue-100">
        {(!isCollapsed || isMobile) && (
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent select-none">
            Brmh Fintech
          </h1>
        )}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 transition-all duration-200 border border-transparent focus:border-blue-400 shadow-md animate-pulse hover:shadow-blue-200"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <RiMenuUnfoldLine size={24} /> : <RiMenuFoldLine size={24} />}
          </button>
        )}
      </div>
      <nav className={`mt-8 flex flex-col gap-2 ${isCollapsed && !isMobile ? 'items-center' : ''}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleItemClick}
              className={
                `flex items-center ${isCollapsed && !isMobile ? 'justify-center' : ''} p-4 my-2 mx-2 rounded-xl transition-all duration-200
                ${isActive ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'}
                ${isMobile ? 'justify-start' : ''}
                group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`
              }
              style={{ boxShadow: isActive ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
            >
              <Icon className={`transition-colors duration-200 ${isCollapsed && !isMobile ? 'text-2xl' : 'text-xl'} group-hover:text-blue-500`} />
              {(!isCollapsed || isMobile) && (
                <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 