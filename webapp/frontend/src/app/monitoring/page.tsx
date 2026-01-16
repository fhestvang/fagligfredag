'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { pipelineApi } from '@/lib/api';
import { LogStream } from '@/components/monitoring/LogStream';

export default function MonitoringPage() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: pipelineApi.getJobs,
    refetchInterval: 3000,
  });

  const runningJobs = jobs?.filter((j) => j.status === 'running') || [];
  const completedJobs = jobs?.filter((j) => j.status === 'completed') || [];
  const failedJobs = jobs?.filter((j) => j.status === 'failed') || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center rounded-lg bg-white p-4 shadow">
          <div className="rounded-lg bg-blue-100 p-3">
            <Loader2 className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Running</p>
            <p className="text-2xl font-bold text-gray-900">{runningJobs.length}</p>
          </div>
        </div>
        <div className="flex items-center rounded-lg bg-white p-4 shadow">
          <div className="rounded-lg bg-green-100 p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-gray-900">{completedJobs.length}</p>
          </div>
        </div>
        <div className="flex items-center rounded-lg bg-white p-4 shadow">
          <div className="rounded-lg bg-red-100 p-3">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-gray-900">{failedJobs.length}</p>
          </div>
        </div>
      </div>

      {/* Live Logs */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
          <Activity className="mr-2 h-5 w-5" />
          Live Logs
        </h2>
        <LogStream />
      </div>

      {/* Job History */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
          <Clock className="mr-2 h-5 w-5" />
          Job History
        </h2>

        {isLoading ? (
          <p className="text-gray-500">Loading jobs...</p>
        ) : jobs?.length === 0 ? (
          <p className="text-gray-500">No jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Job ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Started
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...jobs].reverse().map((job) => (
                  <tr key={job.job_id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900">
                      {job.job_id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {job.job_type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {job.started_at
                        ? new Date(job.started_at).toLocaleString()
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {job.started_at && job.ended_at
                        ? formatDuration(
                            new Date(job.ended_at).getTime() -
                              new Date(job.started_at).getTime()
                          )
                        : job.status === 'running'
                        ? 'Running...'
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    queued: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock },
    running: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Loader2 },
    completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    failed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    cancelled: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: XCircle },
  };

  const { bg, text, icon: Icon } = config[status] || config.queued;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      <Icon className={`mr-1 h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {status}
    </span>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
