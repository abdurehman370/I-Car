"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Menu,
  X,
  User,
  Sun,
  Moon,
  DollarSign,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
}

const navItems = [
  { title: "Car Price Evaluation", url: "/car-valuation", icon: DollarSign },
  { title: "Profile", url: "/profile", icon: User },
];

export default function PartnerPortalLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dealer-theme");
    if (saved === "light") setIsLight(true);
  }, []);

  const toggleTheme = () => {
    setIsLight((prev) => {
      const next = !prev;
      localStorage.setItem("dealer-theme", next ? "light" : "dark");
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      const res = await fetch("/api/dealer/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [isMobile]);

  return (
    <div
      className={cn(
        "min-h-screen flex w-full bg-background text-foreground selection:bg-primary/30",
        isLight && "admin-light"
      )}
    >
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out border-r border-white/5 flex flex-col glass-strong",
          isSidebarOpen ? "w-64" : "w-0 lg:w-20 overflow-hidden lg:overflow-visible"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 px-6 py-8",
            !isSidebarOpen && "lg:justify-center lg:px-0"
          )}
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.35)] shrink-0">
            <Building2 className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          {isSidebarOpen && (
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-tight text-white">iCar</p>
              <p className="font-mono text-[9px] tracking-[0.3em] text-purple-400/80 uppercase">
                Partner Portal
              </p>
            </div>
          )}
        </div>

        <div className="px-3 py-2">
          {isSidebarOpen && (
            <p className="px-3 mb-4 font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase opacity-60">
              Banking &amp; Finance
            </p>
          )}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active =
                pathname === item.url ||
                (item.url !== "/car-valuation" && pathname.startsWith(item.url));
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl px-3.5 h-11 transition-all duration-300 group",
                    active
                      ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                      : "text-gray-400 hover:bg-white/[0.04] hover:text-white border border-transparent"
                  )}
                >
                  {active && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-full bg-purple-400 shadow-[0_0_15px_#a78bfa]"
                      style={{ left: -1 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-all duration-300 group-hover:scale-110",
                      active && "text-purple-300"
                    )}
                  />
                  {isSidebarOpen && (
                    <span
                      className={cn(
                        "text-sm font-bold tracking-tight",
                        active ? "text-white" : "text-gray-400"
                      )}
                    >
                      {item.title}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto px-3 py-6 border-t border-white/5 bg-white/[0.01]">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 rounded-2xl px-3.5 h-11 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all group border border-transparent disabled:opacity-50"
          >
            <LogOut
              className={cn(
                "h-5 w-5 shrink-0 group-hover:-translate-x-1 transition-transform",
                isLoggingOut && "animate-pulse"
              )}
            />
            {isSidebarOpen && (
              <span className="text-sm font-bold tracking-tight">
                {isLoggingOut ? "Signing Out..." : "Sign Out"}
              </span>
            )}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isSidebarOpen ? "lg:ml-64" : "lg:ml-20"
        )}
      >
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 md:px-8 glass-strong border-b border-white/5">
          <button
            type="button"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-foreground transition-colors"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden md:flex items-center gap-2 relative ml-4">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-[2px] bg-purple-400 shadow-[0_0_10px_#a78bfa] rounded-full" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase opacity-60 ml-2">
              Partner Portal · Loan Collateral Pricing
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              title={isLight ? "Switch to Dark" : "Switch to Light"}
              className={cn(
                "relative h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 border",
                isLight
                  ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-amber-400"
              )}
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-400/20 to-violet-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-purple-300">P</span>
            </div>
          </div>
        </header>

        <main className="flex-1 relative p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
