import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  CogIcon,
  ArrowUpTrayIcon,
  CloudIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { epcrsAPI, cadAPI, googleAPI, uploadAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: syncStatus, isLoading: syncLoading } = useQuery(
    'sync-status',
    () => epcrsAPI.getSyncStatus()
  );

  const { data: cadStatus, isLoading: cadLoading } = useQuery(
    'cad-status',
    () => cadAPI.getStatus()
  );

  const { data: uploadStatus, isLoading: uploadLoading } = useQuery(
    'upload-status',
    () => uploadAPI.getUploadStatus()
  );

  const syncAllMutation = useMutation(epcrsAPI.syncAllRecords, {
    onSuccess: () => {
      queryClient.invalidateQueries('sync-status');
      toast.success('All offline records synced successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to sync records');
    },
  });

  const cadSyncMutation = useMutation(cadAPI.manualSync, {
    onSuccess: () => {
      queryClient.invalidateQueries('cad-status');
      toast.success('CAD sync completed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to sync with CAD');
    },
  });

  const handleSyncAll = () => {
    setIsSyncing(true);
    syncAllMutation.mutate(undefined, {
      onSettled: () => setIsSyncing(false),
    });
  };

  const handleCADSync = (syncType: string) => {
    const dateRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      endDate: new Date().toISOString().split('T')[0], // today
    };
    
    cadSyncMutation.mutate({ syncType, dateRange });
  };

  const isLoading = syncLoading || cadLoading || uploadLoading;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          System configuration and synchronization settings
        </p>
      </div>

      {/* Sync Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Synchronization Status
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <WifiIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-900">Offline Records</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {syncStatus?.offlineStatus?.find((s: any) => s._id === 'Pending')?.count || 0}
              </p>
              <p className="text-sm text-gray-500">Pending sync</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-sm font-medium text-gray-900">Synced Records</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {syncStatus?.offlineStatus?.find((s: any) => s._id === 'Synced')?.count || 0}
              </p>
              <p className="text-sm text-gray-500">Successfully synced</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-sm font-medium text-gray-900">Error Records</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {syncStatus?.offlineStatus?.find((s: any) => s._id === 'Error')?.count || 0}
              </p>
              <p className="text-sm text-gray-500">Sync errors</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSyncAll}
              disabled={isSyncing || syncAllMutation.isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing || syncAllMutation.isLoading ? (
                <>
                  <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Sync All Offline Records
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CAD Integration */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            CAD System Integration
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full mr-3 ${
                cadStatus?.status === 'connected' ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  CAD System Status: {cadStatus?.status || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500">
                  Last sync: {cadStatus?.lastSync ? new Date(cadStatus.lastSync).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleCADSync('nemsis')}
                disabled={cadSyncMutation.isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Sync NEMSIS
              </button>
              <button
                onClick={() => handleCADSync('nfirs')}
                disabled={cadSyncMutation.isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Sync NFIRS
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Google Integration */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Google Integration
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CloudIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Google Sheets Integration
                </p>
                <p className="text-sm text-gray-500">
                  Sync roster and incident data with Google Sheets
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // This would open Google OAuth flow
                window.open('/api/google/auth/url', '_blank');
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Connect Google
            </button>
          </div>
        </div>
      </div>

      {/* Upload Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Upload Status
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">NEMSIS Records</h4>
              <div className="space-y-2">
                {uploadStatus?.nemsis?.map((stat: any) => (
                  <div key={stat._id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{stat._id}:</span>
                    <span className="font-medium">{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">NFIRS Records</h4>
              <div className="space-y-2">
                {uploadStatus?.nfirs?.map((stat: any) => (
                  <div key={stat._id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{stat._id}:</span>
                    <span className="font-medium">{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            System Information
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Application Version</dt>
              <dd className="mt-1 text-sm text-gray-900">1.0.0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Database Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Backup</dt>
              <dd className="mt-1 text-sm text-gray-900">Never</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Environment</dt>
              <dd className="mt-1 text-sm text-gray-900">Development</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Settings;