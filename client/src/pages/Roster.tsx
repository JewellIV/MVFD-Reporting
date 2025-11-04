import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { rosterAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Roster: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['roster', currentPage, searchTerm, roleFilter, statusFilter],
    () => rosterAPI.getMembers({
      page: currentPage,
      limit: 10,
      search: searchTerm,
      role: roleFilter,
      isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    })
  );

  const deleteMutation = useMutation(rosterAPI.deleteMember, {
    onSuccess: () => {
      queryClient.invalidateQueries('roster');
      toast.success('Member deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete member');
    },
  });

  const deactivateMutation = useMutation(rosterAPI.deactivateMember, {
    onSuccess: () => {
      queryClient.invalidateQueries('roster');
      toast.success('Member deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to deactivate member');
    },
  });

  const reactivateMutation = useMutation(rosterAPI.reactivateMember, {
    onSuccess: () => {
      queryClient.invalidateQueries('roster');
      toast.success('Member reactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reactivate member');
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeactivate = (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this member?')) {
      deactivateMutation.mutate(id);
    }
  };

  const handleReactivate = (id: string) => {
    reactivateMutation.mutate(id);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { color: 'bg-purple-100 text-purple-800' },
      officer: { color: 'bg-blue-100 text-blue-800' },
      firefighter: { color: 'bg-red-100 text-red-800' },
      emt: { color: 'bg-green-100 text-green-800' },
      paramedic: { color: 'bg-indigo-100 text-indigo-800' },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.firefighter;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading roster. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Roster</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage department members and certifications
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/roster/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Member
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              name="role"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="officer">Officer</option>
              <option value="firefighter">Firefighter</option>
              <option value="emt">EMT</option>
              <option value="paramedic">Paramedic</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Department Members ({data?.total || 0})
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Active and inactive department members
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {data?.users?.map((member: any) => (
            <li key={member.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {String(member.firstName || '')} {String(member.lastName || '')}
                        </p>
                        {member.role && getRoleBadge(String(member.role))}
                        {typeof member.isActive === 'boolean' && getStatusBadge(member.isActive)}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <p>
                          {String(member.email || 'N/A')} • Badge #{String(member.badgeNumber || 'N/A')}
                        </p>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        <p>
                          Department: {String(member.department || 'N/A')}
                        </p>
                      </div>
                      {member.certifications && Array.isArray(member.certifications) && member.certifications.length > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          <p>
                            Certifications: {member.certifications.map((cert: any) => String(cert?.type || 'Unknown')).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/roster/${member.id}`}
                      className="text-green-600 hover:text-green-900"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/roster/${member.id}/edit`}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    {member.isActive ? (
                      <button
                        onClick={() => handleDeactivate(member.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        disabled={deactivateMutation.isLoading}
                      >
                        <UserMinusIcon className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(member.id)}
                        className="text-green-600 hover:text-green-900"
                        disabled={reactivateMutation.isLoading}
                      >
                        <UserPlusIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={deleteMutation.isLoading}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(data.totalPages, currentPage + 1))}
                disabled={currentPage === data.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * 10 + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, data.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{data.total}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(data.totalPages, currentPage + 1))}
                    disabled={currentPage === data.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Roster;