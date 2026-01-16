'use client';

import { useQuery } from '@tanstack/react-query';
import { Database, Play, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { dataApi, pipelineApi, dbtApi } from '@/lib/api';

export default function DashboardPage() {
  const { data: schemas } = useQuery({
    queryKey: ['schemas'],
    queryFn: dataApi.getSchemas,
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: pipelineApi.getJobs,
    refetchInterval: 5000,
  });

  const { data: models } = useQuery({
    queryKey: ['dbt-models'],
    queryFn: dbtApi.getModels,
  });

  const recentJobs = jobs?.slice(-5).reverse() || [];
  const runningJobs = jobs?.filter((j) => j.status === 'running') || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Database Schemas"
          value={schemas?.length || 0}
          icon={Database}
          href="/data"
        />
        <StatCard
          title="dbt Models"
          value={models?.length || 0}
          icon={Play}
          href="/pipeline"
        />
        <StatCard
          title="Running Jobs"
          value={runningJobs.length}
          icon={AlertCircle}
          color={runningJobs.length > 0 ? 'yellow' : 'green'}
          href="/monitoring"
        />
        <StatCard
          title="Completed Jobs"
          value={jobs?.filter((j) => j.status === 'completed').length || 0}
          icon={CheckCircle}
          color="green"
          href="/monitoring"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/pipeline"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Play className="mr-2 h-4 w-4" />
            Run Pipeline
          </Link>
          <Link
            href="/data"
            className="inline-flex items-center rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            <Database className="mr-2 h-4 w-4" />
            Explore Data
          </Link>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Jobs</h2>
        {recentJobs.length === 0 ? (
          <p className="text-gray-500">No jobs yet. Run a pipeline to get started!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Job ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentJobs.map((job) => (
                  <tr key={job.job_id}>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-mono text-gray-900">
                      {job.job_id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                      {job.job_type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                      {job.started_at
                        ? new Date(job.started_at).toLocaleTimeString()
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

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  color = 'blue',
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  href: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <Link
      href={href}
      className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
    >
      <div className="flex items-center">
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusClasses: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        statusClasses[status] || statusClasses.queued
      }`}
    >
      {status}
    </span>
  );
}
