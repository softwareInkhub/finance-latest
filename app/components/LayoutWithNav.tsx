"use client";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function LayoutWithNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hideNav = pathname.startsWith("/login-signup");

  useEffect(() => {
    if (!hideNav && typeof window !== "undefined") {
      if (localStorage.getItem("isLoggedIn") !== "true") {
        router.replace("/login-signup");
      }
    }
  }, [hideNav, router]);

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {!hideNav && (
        <div className="hidden md:block">
          <Sidebar />
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-screen">
        {!hideNav && <Navbar />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 