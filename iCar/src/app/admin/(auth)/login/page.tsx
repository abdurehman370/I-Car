import Signin from "@/components/Auth/Signin";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in - Admin Dashboard",
};

export default function SignIn() {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-[#0B1121] dark:bg-[#0B1121] p-4">
        <div className="w-full max-w-[1000px] overflow-hidden rounded-[20px] bg-[#162032] shadow-2xl flex flex-col xl:flex-row relative z-10">

          <div className="hidden xl:flex w-full xl:w-[45%] p-4">
            <div className="w-full relative overflow-hidden rounded-[16px] bg-[#1C2538] px-10 pt-12 flex flex-col justify-start pb-32">
              <Link className="mb-10 inline-flex items-center gap-3" href="/">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#6366f1] to-[#a855f7] flex items-center justify-center p-[3px]">
                  <div className="w-full h-full bg-[#1C2538] rounded-full"></div>
                </div>
                <span className="text-[22px] font-semibold text-white tracking-wide">NextAdmin</span>
              </Link>

              <p className="mb-2 text-[15px] font-medium text-gray-300">
                Sign in to your account
              </p>

              <h1 className="mb-4 text-[34px] leading-tight font-bold text-white">
                Welcome Back!
              </h1>

              <p className="w-full max-w-[280px] text-[14px] text-gray-400 leading-relaxed">
                Please sign in to your account by completing the necessary fields below
              </p>

              {/* Grid Background */}
              <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C2538] to-transparent z-10" />
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 opacity-20">
                  <defs>
                    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#gridPattern)" />
                </svg>
              </div>
            </div>
          </div>

          <div className="w-full xl:w-[55%] p-8 sm:p-16 flex flex-col justify-center relative">
            <h1 className="mb-10 font-bold text-[32px] text-center text-white">Sign In</h1>
            <Signin />
          </div>

        </div>
      </div>

    </>
  );
}
