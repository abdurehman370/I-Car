"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Mail,
  Building2,
  User,
  Phone,
  MapPin,
  Globe,
  Loader2,
  CheckCircle2,
  FileText,
  Upload,
  X,
  Lock,
  ChevronDown,
} from "lucide-react";
import { DEALER_ROLE, PARTNER_ROLE, USER_ROLE } from "@/lib/dealer-roles";

const inputClass =
  "auth-form-input h-11 w-full rounded-xl border border-gray-200 bg-white text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function SignupPage() {
  const router = useRouter();
  const [data, setData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    dealershipName: "",
    contactPerson: "",
    phoneNumber: "",
    address: "",
    city: "",
    country: "",
    // role will be managed separately
  });
  const [role, setRole] = useState(PARTNER_ROLE);

  const isPartner = role === PARTNER_ROLE;
  const isDealer = role === DEALER_ROLE;
  const orgFieldLabel = isPartner ? "Organization Name" : "Dealership Name";
  const orgFieldPlaceholder = isPartner ? "Acme Financial Group" : "Elite Motors";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  const ALLOWED_LICENSE_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  const MAX_LICENSE_SIZE = 5 * 1024 * 1024;

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLicenseFile(null);
      return;
    }

    if (!ALLOWED_LICENSE_TYPES.includes(file.type)) {
      setError("License must be a PDF or image (JPEG, PNG, or WebP)");
      setLicenseFile(null);
      e.target.value = "";
      return;
    }

    if (file.size > MAX_LICENSE_SIZE) {
      setError("License file must be 5MB or smaller");
      setLicenseFile(null);
      e.target.value = "";
      return;
    }

    setError("");
    setLicenseFile(file);
  };

  const clearLicense = () => {
    setLicenseFile(null);
    const input = document.getElementById(
      "licenseDocument",
    ) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // Validate all required fields
    if (!data.email.trim()) {
      setError("Email Address is required");
      setLoading(false);
      return;
    }

    if (!data.password) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    if (!data.confirmPassword) {
      setError("Confirm Password is required");
      setLoading(false);
      return;
    }

    if (!data.contactPerson.trim()) {
      setError("Contact Person is required");
      setLoading(false);
      return;
    }

    if (!data.phoneNumber.trim()) {
      setError("Phone Number is required");
      setLoading(false);
      return;
    }

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (role !== USER_ROLE && !data.dealershipName.trim()) {
      setError(`${orgFieldLabel} is required`);
      setLoading(false);
      return;
    }

    if (isDealer && !licenseFile) {
      setError("Please upload your dealership license document");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);
      if (role !== USER_ROLE) {
        formData.append("dealershipName", data.dealershipName);
      }
      formData.append("contactPerson", data.contactPerson);
      formData.append("phoneNumber", data.phoneNumber);
      formData.append("address", data.address);
      formData.append("city", data.city);
      formData.append("country", data.country);
      if (licenseFile) {
        formData.append("licenseDocument", licenseFile);
      }
      formData.append("role", role);

      const res = await fetch("/api/dealer/auth/signup", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (res.ok) {
        setSuccessMessage(json.message || "Registration successful!");
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(json.message || "Signup failed");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-6 dark:bg-[#020d1a]">
        <div className="animate-in zoom-in w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl duration-500 dark:bg-gray-900">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            Registration Successful!
          </h2>
          <p className="mb-8 leading-relaxed text-gray-600 dark:text-gray-400">
            {successMessage}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* Left side: Hero Image */}
      <div className="left-main-wrapper relative hidden h-full w-full lg:block lg:w-[40%] xl:w-[45%]">
        <Image
          src="/images/auth/login_img.jpg"
          alt="Join the Network"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div
          className="absolute bottom-12 left-12 right-12 text-white"
          style={{ zIndex: 3 }}
        >
          <h2 className="text-4xl font-bold tracking-tight xl:text-5xl">
            Join the iCar Network
          </h2>
          <p className="mt-4 text-lg text-gray-200">
            Expand your reach, streamline operations, and grow your dealership
            with our intelligent platform.
          </p>
        </div>
        <div className="left-logo absolute left-12 top-12">
          <Link
            href="/"
            className="flex items-center gap-2 transition-transform hover:scale-105"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-xl font-bold italic text-white">iC</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              iCar<span className="text-blue-500">.</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Right side: Form Card */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-gray-50 dark:bg-[#020d1a]">
        <div className="flex min-h-full px-6 py-12 lg:px-12">
          <div className="m-auto w-full max-w-[640px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8 flex justify-center lg:hidden">
            <Link
              href="/"
              className="flex items-center gap-2 transition-transform hover:scale-105"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold italic text-white">
                iC
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                iCar<span className="text-blue-500">.</span>
              </span>
            </Link>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h1 className="bottom-content text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {role === DEALER_ROLE
                ? "Dealer Registration"
                : isPartner
                  ? "Partner Registration"
                  : "User Registration"}
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {isDealer
                ? "Apply for a dealer account. Upload your dealership license for admin verification."
                : isPartner
                  ? "Apply for a partner account to access our banking and financial services."
                  : "Create a user account to buy, sell, and manage your cars."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address *
                </label>
                <div className="group relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                  <input
                    name="email"
                    type="email"
                    placeholder="dealer@example.com"
                    value={data.email}
                    onChange={handleChange}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role *
                </label>
                <div className="group relative">
                  <select
                    name="role"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (e.target.value === USER_ROLE) {
                        setData((prev) => ({ ...prev, dealershipName: "" }));
                      }
                    }}
                    className={`${inputClass} cursor-pointer appearance-none pl-4 pr-10`}
                  >
                    <option value={PARTNER_ROLE}>Banking Sector/Partners</option>
                    <option value={DEALER_ROLE}>Car Dealers</option>
                    <option value={USER_ROLE}>User</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                </div>
              </div>

              {/* Organization / Dealership Name */}
              {role !== USER_ROLE && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {orgFieldLabel} *
                  </label>
                  <div className="group relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                    <input
                      name="dealershipName"
                      type="text"
                      placeholder={orgFieldPlaceholder}
                      value={data.dealershipName}
                      onChange={handleChange}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
              )}

              {/* Contact Person */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contact Person *
                </label>
                <div className="group relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                  <input
                    name="contactPerson"
                    type="text"
                    placeholder="John Doe"
                    value={data.contactPerson}
                    onChange={handleChange}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number *
                </label>
                <div className="group relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                  <input
                    name="phoneNumber"
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={data.phoneNumber}
                    onChange={handleChange}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Address
                </label>
                <div className="group relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                  <input
                    name="address"
                    type="text"
                    placeholder="123 Luxury Way"
                    value={data.address}
                    onChange={handleChange}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  City
                </label>
                <div className="group relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                  <input
                    name="city"
                    type="text"
                    placeholder="Dubai"
                    value={data.city}
                    onChange={handleChange}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Country
                </label>
                <div className="group relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
                  <input
                    name="country"
                    type="text"
                    placeholder="UAE"
                    value={data.country}
                    onChange={handleChange}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password *
                </label>
                <div className="group relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500">
                    <Lock size={18} />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    minLength={6}
                    value={data.password}
                    onChange={handleChange}
                    className={`${inputClass} pl-10 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password *
                </label>
                <div className="group relative">
                  <input
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    minLength={6}
                    value={data.confirmPassword}
                    onChange={handleChange}
                    className={`${inputClass} pl-4 pr-10`}
                  />
                </div>
              </div>

              {/* Dealership License */}
              {isDealer && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dealership License *
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload your official dealership license (PDF, JPEG, PNG, or
                    WebP, max 5MB). Required for admin approval.
                  </p>
                  {!licenseFile ? (
                    <label
                      htmlFor="licenseDocument"
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-4 transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-blue-500 dark:hover:bg-blue-950/20"
                    >
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Click to upload license
                      </span>
                      <span className="text-xs text-gray-500">
                        PDF or image up to 5MB
                      </span>
                      <input
                        id="licenseDocument"
                        name="licenseDocument"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        onChange={handleLicenseChange}
                        className="sr-only"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {licenseFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(licenseFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearLicense}
                        className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                        aria-label="Remove license file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="animate-in fade-in zoom-in-95 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/20">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                {error}
              </div>
            )}

            <div className="pt-2">
              <p className="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                By creating an account you agree to our{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-blue-600 underline underline-offset-2"
                >
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-blue-600 underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <button
                type="submit"
                disabled={loading}
                className="relative flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  "Register for Portal"
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 transition-colors hover:text-blue-500"
            >
              Sign in here
            </Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
