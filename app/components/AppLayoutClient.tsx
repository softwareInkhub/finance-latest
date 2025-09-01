'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AuthWrapper from './AuthWrapper';
import { GlobalTabBar } from './GlobalTabBar';
import { GlobalTabContent } from './GlobalTabContent';
import { usePathname } from 'next/navigation';

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith('/login-signup');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  return (
    <AuthWrapper>
      {isLoginPage ? children : (
        <div className="flex h-screen m-0 p-0 relative bg-gray-50 dark:bg-gray-900 overflow-hidden">
          <Sidebar 
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileOpen={isMobileSidebarOpen}
            onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />
          <div className={`flex-1 flex flex-col transition-all duration-300 lg:ml-64 ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
            <Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
            <GlobalTabBar />
            <div className="flex-1 overflow-hidden min-h-0">
              <GlobalTabContent />
            </div>
          </div>
        </div>
      )}
    </AuthWrapper>
  );
} 