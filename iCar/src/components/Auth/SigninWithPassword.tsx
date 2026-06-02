"use client";
import React, { useState } from "react";
import InputGroup from "../FormElements/InputGroup";
import { useRouter } from "next/navigation";
import { UserIcon, PasswordIcon } from "@/assets/icons";

export default function SigninWithPassword() {
  const router = useRouter();
  const [data, setData] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const json = await res.json();
        setError(json.message || "Login failed");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <InputGroup
        type="text"
        label="Username"
        className="mb-6 [&_input]:py-[15px] [&_input]:!bg-[#1C2538] [&_input]:!border-[#2A3447] [&_input]:text-white [&_input]:focus:!border-cyan-400 [&_label]:text-gray-300 [&_label]:text-[14px] [&_label]:mb-2 [&_svg]:text-gray-400"
        placeholder="Enter your username"
        name="username"
        handleChange={handleChange}
        value={data.username}
        icon={<UserIcon />}
        iconPosition="right"
      />

      <InputGroup
        type="password"
        label="Password"
        className="mb-8 [&_input]:py-[15px] [&_input]:!bg-[#1C2538] [&_input]:!border-[#2A3447] [&_input]:text-white [&_input]:focus:!border-cyan-400 [&_label]:text-gray-300 [&_label]:text-[14px] [&_label]:mb-2 [&_svg]:text-gray-400"
        placeholder="Enter your password"
        name="password"
        handleChange={handleChange}
        value={data.password}
        icon={<PasswordIcon />}
        iconPosition="right"
      />

      {error && (
        <div className="mb-4 text-red-500 text-sm">{error}</div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-[#22d3ee] hover:bg-[#06b6d4] p-4 font-semibold text-[#0B1121] transition-all duration-300 disabled:opacity-70 shadow-lg shadow-cyan-500/20"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </form>
  );
}
