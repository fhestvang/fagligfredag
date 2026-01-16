'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Database,
  Play,
  Activity,
  Home,
  Circle,
  PenSquare,
} from 'lucide-react';
import { useWebSocketStore } from '@/hooks/useWebSocket';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Pipeline', href: '/pipeline', icon: Play },
  { name: 'Data Explorer', href: '/data', icon: Database },
  { name: 'Data Editor', href: '/editor', icon: PenSquare },
  { name: 'Monitoring', href: '/monitoring', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const connected = useWebSocketStore((s) => s.connected);

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-between px-4">
        <span className="text-xl font-bold text-white">NYC Taxi Pipeline</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center text-sm">
          <Circle
            className={`mr-2 h-3 w-3 ${
              connected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'
            }`}
          />
          <span className="text-gray-400">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
