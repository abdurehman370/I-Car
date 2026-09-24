import AdminLoginForm from "@/components/Auth/AdminLoginForm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PortalBrand } from "@/components/app-logo";

export const metadata: Metadata = {
  title: "Admin Sign In",
};

export default function AdminSignIn() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0B1121] lg:flex-row">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl"
        aria-hidden
      />

      {/* Left panel — hero */}
      <div className="relative hidden w-full lg:block lg:w-[48%] xl:w-[50%]">
        <Image
          src="/images/auth-hero.jpg"
          alt="Automotive intelligence platform"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1121]/90 via-[#0B1121]/60 to-cyan-900/30" />

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        {/* Brand */}
        <div className="absolute left-10 top-8 z-10 overflow-visible pt-1">
          <PortalBrand
            href="/"
            subtitle="Admin Portal"
            tone="on-dark"
            subtitleClassName="text-cyan-400/80"
          />
        </div>

        {/* Hero copy */}
        <div className="absolute bottom-12 left-10 right-10 z-10 text-white">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-mono tracking-[0.25em] text-cyan-200/90">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
            SECURE ACCESS
          </span>
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Platform
            <br />
            <span className="text-cyan-300">Control Center</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-gray-300">
            Manage dealers, listings, auctions, and taxonomy from a single
            unified admin workspace.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile brand */}
          <div className="mb-10 flex justify-center lg:hidden">
            <PortalBrand
              href="/"
              subtitle="Admin Portal"
              tone="on-dark"
              subtitleClassName="text-cyan-400/80"
            />
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Sign in with your admin credentials to continue.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#111a2e]/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-8">
            <AdminLoginForm />
          </div>

          <p className="mt-8 text-center text-xs text-gray-500">
            Authorized administrators only.{" "}
            <Link href="/" className="text-cyan-400/80 transition-colors hover:text-cyan-300">
              Return to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}