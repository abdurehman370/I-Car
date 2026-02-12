'use client';

import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, Mail, Phone, MapPin, Building2, User, Eye } from 'lucide-react';

// TypeScript interfaces
interface Dealer {
    id: number;
    email: string;
    dealershipName: string;
    contactPerson: string;
    phoneNumber: string;
    address: string;
    city: string;
    country: string;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt?: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

// Mock data - replace with actual API call later
const mockDealers: Dealer[] = [
    {
        id: 1,
        email: 'john@premiumautos.com',
        dealershipName: 'Premium Autos LLC',
        contactPerson: 'John Smith',
        phoneNumber: '+1 (555) 123-4567',
        address: '123 Main Street',
        city: 'New York',
        country: 'USA',
        approvalStatus: 'pending',
        createdAt: '2024-02-10T10:30:00Z',
    },
    {
        id: 2,
        email: 'sarah@luxurycars.com',
        dealershipName: 'Luxury Cars International',
        contactPerson: 'Sarah Johnson',
        phoneNumber: '+1 (555) 987-6543',
        address: '456 Oak Avenue',
        city: 'Los Angeles',
        country: 'USA',
        approvalStatus: 'pending',
        createdAt: '2024-02-11T14:20:00Z',
    },
    {
        id: 3,
        email: 'mike@citydeals.com',
        dealershipName: 'City Deals Motors',
        contactPerson: 'Mike Brown',
        phoneNumber: '+1 (555) 456-7890',
        address: '789 Park Lane',
        city: 'Chicago',
        country: 'USA',
        approvalStatus: 'pending',
        createdAt: '2024-02-11T16:45:00Z',
    },
    {
        id: 4,
        email: 'lisa@eliteautos.com',
        dealershipName: 'Elite Automotive Group',
        contactPerson: 'Lisa Anderson',
        phoneNumber: '+1 (555) 234-5678',
        address: '321 Business Blvd',
        city: 'Miami',
        country: 'USA',
        approvalStatus: 'approved',
        createdAt: '2024-02-09T09:15:00Z',
    },
    {
        id: 5,
        email: 'robert@speedymotors.com',
        dealershipName: 'Speedy Motors',
        contactPerson: 'Robert Davis',
        phoneNumber: '+1 (555) 876-5432',
        address: '555 Highway 101',
        city: 'Houston',
        country: 'USA',
        approvalStatus: 'rejected',
        createdAt: '2024-02-08T15:45:00Z',
    },
];

const AuthenticateDealers: React.FC = () => {
    const [dealers, setDealers] = useState<Dealer[]>(mockDealers);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
    const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

    // Filter dealers based on search and status
    const filteredDealers: Dealer[] = dealers.filter((dealer) => {
        const matchesSearch =
            dealer.dealershipName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dealer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dealer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || dealer.approvalStatus === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const handleApprove = (dealerId: number): void => {
        // TODO: Implement API call
        console.log('Approve dealer:', dealerId);
        setDealers(dealers.map(d =>
            d.id === dealerId ? { ...d, approvalStatus: 'approved' as const } : d
        ));
        setShowDetailModal(false);
    };

    const handleReject = (dealerId: number): void => {
        // TODO: Implement API call
        console.log('Reject dealer:', dealerId);
        setDealers(dealers.map(d =>
            d.id === dealerId ? { ...d, approvalStatus: 'rejected' as const } : d
        ));
        setShowDetailModal(false);
    };

    const viewDetails = (dealer: Dealer): void => {
        setSelectedDealer(dealer);
        setShowDetailModal(true);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: 'pending' | 'approved' | 'rejected'): React.ReactElement => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
            approved: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
            rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        };

        const icons = {
            pending: <Clock className="w-3 h-3" />,
            approved: <CheckCircle className="w-3 h-3" />,
            rejected: <XCircle className="w-3 h-3" />,
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dealer Registrations</h1>
                    <p className="text-gray-600 dark:text-gray-400">Review and approve dealer registration requests</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Requests</p>
                                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500 mt-2">
                                    {dealers.filter(d => d.approvalStatus === 'pending').length}
                                </p>
                            </div>
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-3">
                                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-500 mt-2">
                                    {dealers.filter(d => d.approvalStatus === 'approved').length}
                                </p>
                            </div>
                            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-500" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
                                <p className="text-3xl font-bold text-red-600 dark:text-red-500 mt-2">
                                    {dealers.filter(d => d.approvalStatus === 'rejected').length}
                                </p>
                            </div>
                            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3">
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by dealership, email, or contact person..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'all'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterStatus('pending')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'pending'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => setFilterStatus('approved')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'approved'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Approved
                            </button>
                            <button
                                onClick={() => setFilterStatus('rejected')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'rejected'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Rejected
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dealers Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Dealership
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Contact Person
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Registered
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredDealers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                                <Building2 className="w-12 h-12 mb-3 opacity-50" />
                                                <p className="text-lg font-medium">No dealers found</p>
                                                <p className="text-sm">Try adjusting your search or filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDealers.map((dealer) => (
                                        <tr key={dealer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                                        <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {dealer.dealershipName}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {dealer.phoneNumber}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                    <span className="text-sm text-gray-900 dark:text-white">{dealer.contactPerson}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                    <span className="text-sm text-gray-900 dark:text-white">{dealer.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                    <span className="text-sm text-gray-900 dark:text-white">
                                                        {dealer.city}, {dealer.country}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(dealer.approvalStatus)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(dealer.createdAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => viewDetails(dealer)}
                                                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {dealer.approvalStatus === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(dealer.id)}
                                                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                                                title="Approve"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(dealer.id)}
                                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                                title="Reject"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Modal */}
                {showDetailModal && selectedDealer && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dealer Details</h3>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6">
                                {/* Status Badge */}
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Registration Status</h4>
                                    {getStatusBadge(selectedDealer.approvalStatus)}
                                </div>

                                {/* Dealership Info */}
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dealership Name</p>
                                            <p className="text-base text-gray-900 dark:text-white font-semibold">{selectedDealer.dealershipName}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Person</p>
                                            <p className="text-base text-gray-900 dark:text-white">{selectedDealer.contactPerson}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                                            <p className="text-base text-gray-900 dark:text-white">{selectedDealer.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</p>
                                            <p className="text-base text-gray-900 dark:text-white">{selectedDealer.phoneNumber}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                                            <p className="text-base text-gray-900 dark:text-white">
                                                {selectedDealer.address}<br />
                                                {selectedDealer.city}, {selectedDealer.country}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Registered On</p>
                                            <p className="text-base text-gray-900 dark:text-white">{formatDate(selectedDealer.createdAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            {selectedDealer.approvalStatus === 'pending' && (
                                <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                                    <button
                                        onClick={() => handleReject(selectedDealer.id)}
                                        className="px-6 py-2.5 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 font-medium transition-colors flex items-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedDealer.id)}
                                        className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthenticateDealers;