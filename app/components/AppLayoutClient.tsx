'use client';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AuthWrapper from './AuthWrapper';
import { usePathname } from 'next/navigation';

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith('/login-signup');
  
  return (
    <AuthWrapper>
      {isLoginPage ? children : (
        <div className="flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-1">{children}</div>
          </div>
        </div>
      )}
    </AuthWrapper>
  );
} 