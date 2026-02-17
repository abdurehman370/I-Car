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
        <div className="mx-auto w-full max-w-[970px]">
            <Breadcrumb pageName="Profile Settings" />

            <div className="grid grid-cols-1 gap-8">
                <div className="col-span-5 xl:col-span-3">
                    <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
                        <div className="border-b border-stroke px-7 py-4 dark:border-dark-3">
                            <h3 className="font-medium text-dark dark:text-white">
                                Dealership Information
                            </h3>
                        </div>
                        <div className="p-7">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-5.5 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                                    <div className="w-full">
                                        <label
                                            className="mb-3 block text-body-sm font-medium text-dark dark:text-white"
                                            htmlFor="dealershipName"
                                        >
                                            Dealership Name
                                        </label>
                                        <input
                                            className="w-full rounded-[7px] border-[1.5px] border-stroke bg-white py-2.5 px-4.5 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                                            type="text"
                                            name="dealershipName"
                                            id="dealershipName"
                                            value={formData.dealershipName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="w-full">
                                        <label
                                            className="mb-3 block text-body-sm font-medium text-dark dark:text-white"
                                            htmlFor="contactPerson"
                                        >
                                            Contact Person
                                        </label>
                                        <input
                                            className="w-full rounded-[7px] border-[1.5px] border-stroke bg-white py-2.5 px-4.5 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                                            type="text"
                                            name="contactPerson"
                                            id="contactPerson"
                                            value={formData.contactPerson}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-5.5">
                                    <label
                                        className="mb-3 block text-body-sm font-medium text-dark dark:text-white"
                                        htmlFor="phoneNumber"
                                    >
                                        Phone Number
                                    </label>
                                    <input
                                        className="w-full rounded-[7px] border-[1.5px] border-stroke bg-white py-2.5 px-4.5 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                                        type="text"
                                        name="phoneNumber"
                                        id="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="mb-5.5">
                                    <label
                                        className="mb-3 block text-body-sm font-medium text-dark dark:text-white"
                                        htmlFor="address"
                                    >
                                        Address
                                    </label>
                                    <input
                                        className="w-full rounded-[7px] border-[1.5px] border-stroke bg-white py-2.5 px-4.5 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                                        type="text"
                                        name="address"
                                        id="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="mb-5.5 grid grid-cols-1 gap-4.5 sm:grid-cols-2">
                                    <div className="w-full">
                                        <label
                                            className="mb-3 block text-body-sm font-medium text-dark dark:text-white"
                                            htmlFor="city"
                                        >
                                            City
                                        </label>
                                        <input
                                            className="w-full rounded-[7px] border-[1.5px] border-stroke bg-white py-2.5 px-4.5 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                                            type="text"
                                            name="city"
                                            id="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="w-full">
                                        <label
                                            className="mb-3 block text-body-sm font-medium text-dark dark:text-white"
                                            htmlFor="country"
                                        >
                                            Country
                                        </label>
                                        <input
                                            className="w-full rounded-[7px] border-[1.5px] border-stroke bg-white py-2.5 px-4.5 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                                            type="text"
                                            name="country"
                                            id="country"
                                            value={formData.country}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4.5">
                                    <button
                                        className="flex justify-center rounded-[7px] border border-stroke px-6 py-[7px] font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
                                        type="button"
                                        onClick={() => window.history.back()}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="flex justify-center rounded-[7px] bg-primary px-6 py-[7px] font-medium text-white hover:bg-opacity-90"
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
            </div>
        </div>
    );
}
