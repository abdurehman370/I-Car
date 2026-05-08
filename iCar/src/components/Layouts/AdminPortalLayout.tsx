"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Bell, Command, LayoutDashboard, Car, 
  Settings, LogOut, Zap, Menu, X, 
  User, ShieldCheck, Users, Database, BellRing, List
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
}

const adminNavItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Profile", url: "/admin/profile", icon: User },
    { title: "Dealers", url: "/admin/dealers", icon: Users },
    { title: "Listings", url: "/admin/listings", icon: List },
    { title: "Taxonomy", url: "/admin/taxonomy", icon: Database },
    { title: "Authenticate", url: "/admin/authenticate-dealers", icon: ShieldCheck },
];

export default function AdminPortalLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      // Assuming a similar logout endpoint for admin
      const res = await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        router.push("/admin/login");
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
    <div className="min-h-screen flex w-full bg-background text-foreground selection:bg-primary/30">
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
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] shrink-0">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          {isSidebarOpen && (
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-tight text-white">iCar</p>
              <p className="font-mono text-[9px] tracking-[0.3em] text-cyan-400 uppercase">Admin Portal</p>
            </div>
          )}
        </div>

        <div className="px-3 py-2">
          {isSidebarOpen && (
            <p className="px-3 mb-4 font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase opacity-60">
              Management
            </p>
          )}
          <nav className="space-y-1.5">
            {adminNavItems.map((item) => {
              const active = pathname === item.url || (item.url !== "/admin" && pathname.startsWith(item.url));
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
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden md:flex items-center gap-2 relative ml-4">
            <div 
              className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-[2px] bg-cyan-500 shadow-[0_0_10px_#22d3ee] rounded-full" 
            />
            <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase opacity-60 ml-2">
              Admin Portal · Master Workspace
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-auto hidden sm:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
              <input
                placeholder="Search dealers, listings, taxonomy..."
                className="w-full h-10 pl-10 pr-12 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 h-5 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-gray-500">
                <Command className="h-2.5 w-2.5" />K
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button className="relative h-10 w-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <BellRing className="h-5 w-5" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-cyan-400 border-2 border-[#050b14] animate-pulse" />
             </button>

             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-cyan-400">A</span>
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
