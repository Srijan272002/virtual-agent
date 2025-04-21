'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useLayoutStore } from '@/lib/stores/useLayoutStore'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const isSidebarOpen = useLayoutStore((state) => state.isSidebarOpen)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar isOpen={isSidebarOpen} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 