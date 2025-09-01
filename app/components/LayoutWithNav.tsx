"use client";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export default function LayoutWithNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hideNav = pathname.startsWith("/login-signup");

  useEffect(() => {
    if (!hideNav && typeof window !== "undefined") {
      if (localStorage.getItem("isLoggedIn") !== "true") {
        router.replace("/login-signup");
      }
    }
  }, [hideNav, router]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50/30">
      {/* Desktop Sidebar */}
      {!hideNav && (
        <div className="hidden md:block relative z-20">
          <Sidebar />
        </div>
      )}
      
      {/* Mobile Sidebar Overlay */}
      {!hideNav && isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      {!hideNav && (
        <div className={`
          md:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-200 ease-out
          ${isMobileMenuOpen ? 'transform translate-x-0' : 'transform -translate-x-full'}
        `}>
          <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        {!hideNav && (
          <Navbar onMobileMenuToggle={handleMobileMenuToggle} />
        )}
        
        <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/50 to-white/50 backdrop-blur-sm">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 