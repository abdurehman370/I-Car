"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Command, LayoutDashboard, Car, PlusCircle,
  History, Settings, LogOut, Menu, X, ChevronRight,
  User, BellRing, Sun, Moon, DollarSign, Gavel
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalBrand } from "@/components/app-logo";
import { DealerNotificationBell } from "@/components/dealer/DealerNotificationBell";

interface Props {
  children: ReactNode;
}

const dealerItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Inventory", url: "/(dealer)/(portal)/listings", icon: Car },
  { title: "List Vehicle", url: "/(dealer)/(portal)/list-vehicle", icon: PlusCircle },
  { title: "Profile", url: "/(dealer)/(portal)/profile", icon: User },
];

// Map actual URLs to cleaner display paths if needed, 
// but for now I'll use the ones that work in the current project structure.
// Note: In Next.js, route groups like (dealer) are omitted from the URL.
// So if the structure is src/app/(dealer)/(portal)/listings/page.tsx, the URL is /listings.
const navItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Inventory", url: "/listings", icon: Car },
    { title: "List Vehicle", url: "/list-vehicle", icon: PlusCircle },
    { title: "Vehicle Valuation", url: "/vehicle-valuation", icon: DollarSign },
    { title: "Auctions", url: "/auctions", icon: Gavel },
    { title: "Auction Alerts", url: "/auction-notifications", icon: BellRing },
    { title: "Profile", url: "/profile", icon: User },
];

export default function DealerPortalLayout({ children }: Props) {
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
    setIsLight(prev => {
      const next = !prev;
      localStorage.setItem("dealer-theme", next ? "light" : "dark");
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      const res = await fetch("/api/dealer/auth/logout", {
        method: "POST",
      });
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
        "min-h-screen flex w-full text-foreground selection:bg-cyan-500/30 font-sans relative overflow-x-hidden",
        isLight ? "admin-light" : "bg-[#030814]"
      )}
    >
      {/* Ambient Cyber Flares */}
      <div className="pointer-events-none fixed -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.07] blur-[140px] z-0" aria-hidden />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-teal-500/[0.05] blur-[160px] z-0" aria-hidden />
      <div className="pointer-events-none fixed -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full bg-blue-600/[0.04] blur-[150px] z-0" aria-hidden />

      {/* Cyber Grid Pattern Overlay */}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-0",
          isLight ? "opacity-[0.04]" : "opacity-[0.025]"
        )}
        style={{
          backgroundImage: "linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
        aria-hidden
      />

      {/* Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Cyber Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out border-r flex flex-col backdrop-blur-2xl",
          isLight
            ? "glass-strong border-slate-200/80"
            : "border-cyan-500/10 bg-[#050f1d]/90 shadow-[4px_0_30px_rgba(0,0,0,0.5)]",
          isSidebarOpen ? "w-64" : "w-0 lg:w-20 overflow-hidden lg:overflow-visible"
        )}
      >
        {/* Brand Header */}
        <div className={cn("flex items-center justify-between px-6 py-7 border-b border-white/[0.06]", !isSidebarOpen && "lg:justify-center lg:px-0")}>
          <PortalBrand
            href="/dashboard"
            subtitle="Dealer Portal"
            tone={isLight ? "on-light" : "on-dark"}
            compact={!isSidebarOpen && !isMobile}
          />
        </div>

        {/* Navigation list */}
        <div className="px-3.5 py-5 flex-1 overflow-y-auto no-scrollbar">
          {isSidebarOpen && (
            <div className="flex items-center justify-between px-3 mb-3">
              <span className="font-mono text-[9px] tracking-[0.25em] text-slate-500 uppercase font-semibold">
                CORE CHANNELS
              </span>
              <span className="h-1 w-1 rounded-full bg-cyan-400/40" />
            </div>
          )}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.url || (item.url !== "/" && item.url !== "/dashboard" && pathname.startsWith(item.url));
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  className={cn(
                    "relative flex items-center gap-3.5 rounded-xl px-3.5 h-11 transition-all duration-200 group text-sm font-medium",
                    active 
                      ? "bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent text-cyan-300 border border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.08)]" 
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100 border border-transparent"
                  )}
                >
                  {active && (
                    <span 
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" 
                    />
                  )}
                  <item.icon className={cn(
                    "h-5 w-5 shrink-0 transition-all duration-200 group-hover:scale-110",
                    active ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]" : "text-slate-400 group-hover:text-slate-200"
                  )} />
                  {isSidebarOpen && (
                    <span className={cn("tracking-tight font-medium", active ? "text-white font-semibold" : "text-slate-300")}>
                      {item.title}
                    </span>
                  )}
                  {!isSidebarOpen && !isMobile && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 rounded-xl bg-[#07162b] border border-cyan-400/20 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                      {item.title}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer utilities */}
        <div
          className={cn(
            "p-3.5 space-y-1.5 border-t",
            isLight ? "border-slate-200/80 bg-slate-50/80" : "border-white/[0.06] bg-[#030914]/40"
          )}
        >
          <Link
            href="/profile"
            className={cn(
              "relative flex items-center gap-3.5 rounded-xl px-3.5 h-10 transition-all duration-200 group text-sm font-medium",
              pathname === "/profile" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-400/20" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent"
            )}
          >
            <User className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
            {isSidebarOpen && <span className="tracking-tight text-slate-300">Account Profile</span>}
          </Link>
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3.5 rounded-xl px-3.5 h-10 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all group border border-transparent disabled:opacity-50 text-sm font-medium"
          >
            <LogOut className={cn("h-4 w-4 shrink-0 group-hover:-translate-x-0.5 transition-transform text-rose-400/70 group-hover:text-rose-400", isLoggingOut && "animate-pulse")} />
            {isSidebarOpen && <span className="tracking-tight text-slate-300 group-hover:text-rose-300">{isLoggingOut ? "Disconnecting..." : "Disconnect"}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10",
        isSidebarOpen ? "lg:ml-64" : "lg:ml-20"
      )}>
        {/* Cyber Header */}
        <header
          className={cn(
            "sticky top-0 z-30 h-16 flex items-center justify-between gap-4 px-4 md:px-8 backdrop-blur-2xl border-b",
            isLight ? "glass-strong border-slate-200/80" : "bg-[#040e1b]/80 border-cyan-500/10"
          )}
        >
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-400/30 text-slate-400 hover:text-cyan-300 transition-all"
              aria-label="Toggle Sidebar"
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/[0.06] border border-cyan-400/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-200/90 uppercase font-semibold">
                SYSTEM OPERATIONAL · VERIFIED DEALER
              </span>
            </div>
          </div>

          {/* Center search HUD */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              <input
                placeholder="Search inventory, VIN, model appraisals..."
                className="w-full h-10 pl-10 pr-14 rounded-xl bg-[#061426]/70 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-mono text-slate-400">
                <Command className="h-2.5 w-2.5 mr-0.5" />K
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
             {/* Theme Toggle */}
             <button
               onClick={toggleTheme}
               title={isLight ? "Switch to Dark" : "Switch to Light"}
               className={cn(
                 "relative h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 border",
                 isLight
                   ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                   : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/5"
               )}
             >
               {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
             </button>

             <DealerNotificationBell isLight={isLight} />

             {/* Dealer avatar badge */}
             <div className={cn("flex items-center gap-2 pl-2 border-l", isLight ? "border-slate-200" : "border-white/10")}>
               <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <span className="text-sm font-bold text-cyan-300">D</span>
               </div>
               <div className="hidden xl:block text-left">
                  <p className="text-xs font-semibold text-white leading-tight">Approved Partner</p>
                  <p className="text-[10px] font-mono text-cyan-400/70 tracking-wider">LEVEL 1 · TIER A</p>
               </div>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 relative p-4 md:p-8">
            <AnimatePresence mode="wait">
                <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
