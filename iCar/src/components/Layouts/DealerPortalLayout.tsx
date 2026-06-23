"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Bell, Command, LayoutDashboard, Car, PlusCircle, 
  History, Settings, LogOut, Zap, Menu, X, ChevronRight,
  User, Briefcase, BellRing, Sun, Moon, DollarSign, Gavel
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DealerNotificationBell } from "@/components/dealer/DealerNotificationBell";

interface Props {
  children: ReactNode;
}

const dealerItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Inventory", url: "/(dealer)/(portal)/listings", icon: Car },
  { title: "List Vehicle", url: "/(dealer)/(portal)/list-vehicle", icon: PlusCircle },
  { title: "Alerts", url: "/(dealer)/(portal)/alerts", icon: Bell },
  { title: "Dealer Tools", url: "/(dealer)/(portal)/dealer-tools", icon: Briefcase },
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
    { title: "Alerts", url: "/alerts", icon: Bell },
    { title: "Dealer Tools", url: "/dealer-tools", icon: Briefcase },
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
    <div className={cn("min-h-screen flex w-full bg-background text-foreground selection:bg-primary/30", isLight && "admin-light")}>
      {/* Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out border-r border-white/5 flex flex-col glass-strong",
        isSidebarOpen ? "w-64" : "w-0 lg:w-20 overflow-hidden lg:overflow-visible"
      )}>
        {/* Brand */}
        <div className={cn("flex items-center gap-3 px-6 py-8", !isSidebarOpen && "lg:justify-center lg:px-0")}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] shrink-0">
            <Zap className="h-5 w-5 text-black" strokeWidth={2.5} />
          </div>
          {isSidebarOpen && (
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-tight text-white">iCar</p>
              <p className="font-mono text-[9px] tracking-[0.3em] text-cyan-400/70 uppercase">Dealer Portal</p>
            </div>
          )}
        </div>

        <div className="px-3 py-2">
          {isSidebarOpen && (
            <p className="px-3 mb-4 font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase opacity-60">
              Navigation
            </p>
          )}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.url || (item.url !== "/" && item.url !== "/dashboard" && pathname.startsWith(item.url));
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl px-3.5 h-11 transition-all duration-300 group",
                    active 
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.05)]" 
                      : "text-gray-400 hover:bg-white/[0.04] hover:text-white border border-transparent"
                  )}
                >
                  {active && (
                    <span 
                      className="absolute top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]" 
                      style={{ left: -1 }}
                    />
                  )}
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-all duration-300 group-hover:scale-110", active && "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]")} />
                  {isSidebarOpen && <span className={cn("text-sm font-bold tracking-tight", active ? "text-white" : "text-gray-400")}>{item.title}</span>}
                  {!isSidebarOpen && !isMobile && (
                    <div className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-gray-900 border border-white/10 text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-2xl">
                        {item.title}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto px-3 py-6 space-y-1.5 border-t border-white/5 bg-white/[0.01]">
            <Link
                href="/profile"
                className={cn(
                "relative flex items-center gap-3 rounded-2xl px-3.5 h-11 transition-all duration-300 group",
                pathname === "/profile" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10" : "text-gray-400 hover:bg-white/[0.04] hover:text-white border border-transparent"
                )}
            >
                {pathname === "/profile" && (
                    <span 
                      className="absolute top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]" 
                      style={{ left: -1 }}
                    />
                )}
                <User className="h-5 w-5 shrink-0 transition-transform" />
                {isSidebarOpen && <span className="text-sm font-bold tracking-tight">Profile</span>}
            </Link>
            <Link
                href="/settings"
                className={cn(
                "relative flex items-center gap-3 rounded-2xl px-3.5 h-11 transition-all duration-300 group",
                pathname === "/settings" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10" : "text-gray-400 hover:bg-white/[0.04] hover:text-white border border-transparent"
                )}
            >
                {pathname === "/settings" && (
                    <span 
                      className="absolute top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]" 
                      style={{ left: -1 }}
                    />
                )}
                <Settings className="h-5 w-5 shrink-0 group-hover:rotate-45 transition-transform" />
                {isSidebarOpen && <span className="text-sm font-bold tracking-tight">Settings</span>}
            </Link>
            <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-3 rounded-2xl px-3.5 h-11 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all group border border-transparent disabled:opacity-50"
            >
                <LogOut className={cn("h-5 w-5 shrink-0 group-hover:-translate-x-1 transition-transform", isLoggingOut && "animate-pulse")} />
                {isSidebarOpen && <span className="text-sm font-bold tracking-tight">{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>}
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        isSidebarOpen ? "lg:ml-64" : "lg:ml-20"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 md:px-8 glass-strong border-b border-white/5">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-foreground transition-colors"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden md:flex items-center gap-2 relative ml-4">
            <div 
              className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-[2px] bg-cyan-400 shadow-[0_0_10px_#22d3ee] rounded-full" 
            />
            <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase opacity-60 ml-2">
              Dealer Portal · Workspace
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-auto hidden sm:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
              <input
                placeholder="Search inventory, valuations..."
                className="w-full h-10 pl-10 pr-12 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-gray-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 h-5 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-gray-500">
                <Command className="h-2.5 w-2.5" />K
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Theme Toggle */}
             <button
               onClick={toggleTheme}
               title={isLight ? "Switch to Dark" : "Switch to Light"}
               className={cn(
                 "relative h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 border",
                 isLight
                   ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                   : "bg-white/5 border-white/10 text-gray-400 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/5"
               )}
             >
               {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
             </button>

             <DealerNotificationBell isLight={isLight} />

             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-cyan-400">D</span>
             </div>
          </div>
        </header>

        {/* Main */}
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
