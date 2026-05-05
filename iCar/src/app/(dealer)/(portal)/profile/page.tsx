"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function Page() {
    const [formData, setFormData] = useState({
        dealershipName: "",
        contactPerson: "",
        phoneNumber: "",
        address: "",
        city: "",
        country: "",
    });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch("/api/dealer/profile");
                if (response.ok) {
                    const data = await response.json();
                    setFormData({
                        dealershipName: data.dealershipName || "",
                        contactPerson: data.contactPerson || "",
                        phoneNumber: data.phoneNumber || "",
                        address: data.address || "",
                        city: data.city || "",
                        country: data.country || "",
                    });
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const response = await fetch("/api/dealer/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success("Profile updated successfully");
                // Trigger a refresh of the user info in the header
                window.location.reload();
            } else {
                toast.error("Failed to update profile");
            }
        } catch (error) {
            console.error("Update error:", error);
            toast.error("An error occurred");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    return (
        <div className="mx-auto w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono text-cyan-400/70 tracking-widest uppercase">Management</span>
                <h1 className="text-3xl font-bold text-white tracking-tight">Profile Settings</h1>
            </div>

            <div className="panel border-white/5 overflow-hidden">
                <div className="border-b border-white/10 px-8 py-5 bg-white/[0.02]">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        Dealership Information
                    </h3>
                </div>
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider ml-1">Dealership Name</label>
                                <input
                                    className="w-full h-12 rounded-xl glass border border-white/10 px-4 text-white outline-none focus:border-cyan-400/30 transition-all"
                                    type="text"
                                    name="dealershipName"
                                    value={formData.dealershipName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider ml-1">Contact Person</label>
                                <input
                                    className="w-full h-12 rounded-xl glass border border-white/10 px-4 text-white outline-none focus:border-cyan-400/30 transition-all"
                                    type="text"
                                    name="contactPerson"
                                    value={formData.contactPerson}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider ml-1">Phone Number</label>
                            <input
                                className="w-full h-12 rounded-xl glass border border-white/10 px-4 text-white outline-none focus:border-cyan-400/30 transition-all"
                                type="text"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider ml-1">Address</label>
                            <input
                                className="w-full h-12 rounded-xl glass border border-white/10 px-4 text-white outline-none focus:border-cyan-400/30 transition-all"
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider ml-1">City</label>
                                <input
                                    className="w-full h-12 rounded-xl glass border border-white/10 px-4 text-white outline-none focus:border-cyan-400/30 transition-all"
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider ml-1">Country</label>
                                <input
                                    className="w-full h-12 rounded-xl glass border border-white/10 px-4 text-white outline-none focus:border-cyan-400/30 transition-all"
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <button
                                className="px-6 py-3 rounded-xl glass border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
                                type="button"
                                onClick={() => window.history.back()}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-bold hover:scale-[1.02] transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                                type="submit"
                                disabled={updating}
                            >
                                {updating ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
