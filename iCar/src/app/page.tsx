"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Building2, ShieldCheck } from "lucide-react";
import { getPortalHomeForRole } from "@/lib/portal-access";
import { dealerDisplayName } from "@/lib/dealer-roles";

function BadgeCard({
  icon: Icon,
  title,
  text,
  tint,
  delay,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  text: string;
  tint: "indigo" | "violet" | "rose";
  delay: number;
}) {
  const tintClasses =
    tint === "indigo"
      ? "bg-cyan-400/10 border-cyan-300/20 text-cyan-200"
      : tint === "violet"
        ? "bg-teal-400/10 border-teal-300/20 text-teal-200"
        : "bg-rose-400/10 border-rose-300/20 text-rose-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      className="group"
    >
      <div className="group relative overflow-hidden rounded-[26px] bg-[#071423]/60 p-[1px] transition-all duration-500 hover:-translate-y-1">
        {/* luminous border + crisp outline */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[26px] opacity-55 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(135deg, rgba(45, 212, 191, 0.45), rgba(34, 211, 238, 0.25), rgba(59, 130, 246, 0.18))",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[1px] rounded-[25px] ring-1 ring-cyan-200/20 transition-all duration-500 group-hover:ring-cyan-200/40"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-[25px] border border-white/10 bg-[#081a2c]/65 p-7 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent opacity-80" aria-hidden />

          <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${tintClasses}`}>
            <Icon className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
          <p className="text-sm leading-relaxed text-white/72">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const [session, setSession] = React.useState<{ name: string; dashboardHref: string } | null | "loading">("loading");

  React.useEffect(() => {
    fetch("/api/dealer/profile")
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data) => {
        if (data?.email) {
          setSession({
            name: dealerDisplayName(data),
            dashboardHref: getPortalHomeForRole(data.role),
          });
        } else {
          setSession(null);
        }
      })
      .catch(() => setSession(null));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020d1a] text-white selection:bg-cyan-500/30">
      <Image
        src="/images/auth-hero.jpg"
        alt=""
        aria-hidden
        fill
        priority
        className="object-cover opacity-40 saturate-125"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#020d1a]/40 via-[#020d1a]/75 to-[#020d1a]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.12),transparent_55%)]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(circle at 50% 30%, black 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-6 md:px-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.35)]" />
            <span className="text-lg font-semibold tracking-tight">iCar</span>
            <span className="ml-2 hidden font-mono text-[10px] tracking-[0.2em] text-white/55 sm:block">
              INTELLIGENCE
            </span>
          </motion.div>

          <span className="hidden font-mono text-[10px] tracking-[0.3em] text-white/55 md:block">
            v2.4 · SECURE CHANNEL
          </span>
        </header>

        {/* Main */}
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center"
            >
              <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/35 bg-cyan-500/5 px-4 py-1.5 text-[11px] font-mono tracking-[0.28em] text-cyan-100/90 shadow-[0_0_0_1px_rgba(34,211,238,0.06)] backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.55)]" />
                AUTOMOTIVE INTELLIGENCE
              </span>
              <h1 className="mb-5 text-5xl font-extrabold tracking-tight text-white md:text-7xl">
                Welcome to <span className="text-cyan-300">iCar</span>
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
                AI-powered automotive intelligence for dealers, banking partners, and industry professionals.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              {session === "loading" ? (
                <div className="h-12 w-64 animate-pulse rounded-full bg-white/10" />
              ) : session ? (
                <Link
                  href={session.dashboardHref}
                  className="group inline-flex items-center gap-3 rounded-full bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-[#020d1a] shadow-[0_0_32px_rgba(34,211,238,0.35)] transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_0_48px_rgba(34,211,238,0.5)]"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-3 rounded-full bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-[#020d1a] shadow-[0_0_32px_rgba(34,211,238,0.35)] transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_0_48px_rgba(34,211,238,0.5)]"
                  >
                    Login
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-8 py-3.5 text-sm font-semibold text-white/90 backdrop-blur-xl transition-all duration-300 hover:border-cyan-200/35 hover:bg-white/[0.08]"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </motion.div>

            {/* Badges */}
            <div className="mt-16 grid gap-5 md:grid-cols-3">
              <BadgeCard
                icon={BarChart3}
                title="Live Market Data"
                text="Access fresh listings from Dubizzle, AutoScout24 and more instantly."
                tint="indigo"
                delay={0.45}
              />
              <BadgeCard
                icon={ShieldCheck}
                title="Verified Dealers"
                text="Secure portal dedicated to approved dealership networks."
                tint="violet"
                delay={0.55}
              />
              <BadgeCard
                icon={Building2}
                title="Global Regions"
                text="Specialized clients for UAE, Lebanon, and European markets."
                tint="rose"
                delay={0.65}
              />
            </div>
          </div>
        </main>

        <footer className="flex items-center justify-between px-6 py-6 text-xs font-mono tracking-widest text-white/50 md:px-12">
          <span>© 2026 ICAR SYSTEMS</span>
          <span className="hidden md:block">PROTOCOL · TLS 1.3</span>
        </footer>
      </div>
    </div>
  );
}
