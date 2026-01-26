'use client';

import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <main className="flex flex-1 flex-col pb-16 lg:pb-0">
          <div className="mx-auto w-full max-w-screen-sm md:max-w-screen-md lg:max-w-none flex-1 flex flex-col">
            {children}
          </div>
        </main>

        {/* Mobile/Tablet Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
