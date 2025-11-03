import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  FireIcon,
  UsersIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { nemsisAPI, nfirsAPI, epcrsAPI, uploadAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { data: nemsisStats, isLoading: nemsisLoading } = useQuery(
    'nemsis-stats',
    () => nemsisAPI.getRecords({ limit: 1 }),
    {
      select: (data) => data.total
    }
  );

  const { data: nfirsStats, isLoading: nfirsLoading } = useQuery(
    'nfirs-stats',
    () => nfirsAPI.getRecords({ limit: 1 }),
    {
      select: (data) => data.total
    }
  );

  const { data: offlineStats, isLoading: offlineLoading } = useQuery(
    'offline-stats',
    () => epcrsAPI.getSyncStatus()
  );

  const { data: uploadStats, isLoading: uploadLoading } = useQuery(
    'upload-stats',
    () => uploadAPI.getUploadStatus()
  );

  const stats = [
    {
      name: 'NEMSIS Records',
      value: nemsisStats || 0,
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/nemsis',
    },
    {
      name: 'NFIRS Records',
      value: nfirsStats || 0,
      icon: FireIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/nfirs',
    },
    {
      name: 'Roster Members',
      value: 'Loading...',
      icon: UsersIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      href: '/roster',
    },
    {
      name: 'Pending Sync',
      value: offlineStats?.offlineStatus?.find((s: any) => s._id === 'Pending')?.count || 0,
      icon: ArrowUpTrayIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      href: '/nemsis',
    },
  ];

  const isLoading = nemsisLoading || nfirsLoading || offlineLoading || uploadLoading;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to the Mangohick Volunteer Fire Department reporting system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.href}
              className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <dt>
                <div className={`absolute ${stat.bgColor} rounded-md p-3`}>
                  <IconComponent className={`h-6 w-6 ${stat.color}`} />
                </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </dd>
          </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/nemsis"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                  <DocumentTextIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" />
                  New NEMSIS Record
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create a new patient care record
                </p>
              </div>
            </Link>

            <Link
              to="/nfirs"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-red-50 text-red-700 ring-4 ring-white">
                  <FireIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" />
                  New NFIRS Record
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create a new fire incident report
                </p>
              </div>
            </Link>

            <Link
              to="/roster"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-green-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                  <UsersIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" />
                  Manage Roster
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  View and manage department members
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            System Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
              <span className="text-sm text-gray-900">Database connection active</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
              <span className="text-sm text-gray-900">Offline sync available</span>
            </div>
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
              <span className="text-sm text-gray-900">CAD sync requires configuration</span>
            </div>
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
              <span className="text-sm text-gray-900">Google integration requires setup</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;