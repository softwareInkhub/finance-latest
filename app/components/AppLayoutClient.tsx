'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { RiBankLine, RiPriceTag3Line, RiFileList3Line, RiBarChartLine } from 'react-icons/ri';
import AuthWrapper from './AuthWrapper';
import { GlobalTabBar } from './GlobalTabBar';
import { GlobalTabContent } from './GlobalTabContent';
import { usePathname } from 'next/navigation';
import { useGlobalTabs } from '../contexts/GlobalTabContext';

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith('/login-signup');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { tabs, activeTabId } = useGlobalTabs();
  const getSectionSubtitle = (path: string): string => {
    // Map top-level routes to a friendly heading
    const segments = (path || '/').split('?')[0].split('#')[0].split('/').filter(Boolean);
    const top = segments[0] || '';
    switch (top) {
      case 'dashboard':
        return 'Home';
      case 'banks':
      case 'super-bank':
        return 'All Transactions Dashboard';
      case 'files':
        return 'Manage documents';
      case 'tags':
        return 'Organize with tags';
      case 'reports':
        return 'Financial reports and stats';
      case 'login-signup':
        return '';
      default:
        return segments.length ? segments.map(s => s.replace(/-/g, ' ')).join(' / ') : 'Home';
    }
  };

  const getBrandTitle = (path: string): string => {
    const top = (path || '/').split('?')[0].split('#')[0].split('/').filter(Boolean)[0] || '';
    switch (top) {
      case 'banks':
      case 'super-bank':
        return 'Super Bank';
      case 'tags':
        return 'Tags';
      case 'files':
        return 'Files';
      case 'reports':
        return 'Reports';
      default:
        return 'Brmh Fintech';
    }
  };

  const getBrandIcon = (path: string): React.ReactNode | null => {
    const top = (path || '/').split('?')[0].split('#')[0].split('/').filter(Boolean)[0] || '';
    switch (top) {
      case 'banks':
      case 'super-bank':
        return <RiBankLine className="w-4 h-4" />;
      case 'tags':
        return <RiPriceTag3Line className="w-4 h-4" />;
      case 'files':
        return <RiFileList3Line className="w-4 h-4" />;
      case 'reports':
        return <RiBarChartLine className="w-4 h-4" />;
      default:
        return null;
    }
  };
  
  return (
    <AuthWrapper>
      {isLoginPage ? children : (
        <div className="flex h-screen m-0 p-0 relative bg-gray-50 dark:bg-gray-900 overflow-hidden">
          <Sidebar 
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileOpen={isMobileSidebarOpen}
            onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
            <Navbar 
              onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} 
              title={getSectionSubtitle(pathname)}
              brandTitle={(tabs.find(t => t.id === activeTabId)?.title) || getBrandTitle(pathname)}
              brandIcon={(() => {
                const tab = tabs.find(t => t.id === activeTabId);
                if (tab) {
                  switch (tab.type) {
                    case 'banks':
                      return <RiBankLine className="w-4 h-4" />;
                    case 'tags':
                      return <RiPriceTag3Line className="w-4 h-4" />;
                    case 'files':
                      return <RiFileList3Line className="w-4 h-4" />;
                    case 'reports':
                      return <RiBarChartLine className="w-4 h-4" />;
                    default:
                      return getBrandIcon(pathname);
                  }
                }
                return getBrandIcon(pathname);
              })()}
            />
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