'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import {
  Home,
  MessageSquare,
  Settings,
  UserCircle,
  Plus
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
}

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'Profile', href: '/profile', icon: UserCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ isOpen }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-card pt-16 transition-transform duration-300 ease-in-out md:sticky md:translate-x-0',
        !isOpen && '-translate-x-full'
      )}
    >
      <div className="flex-1 space-y-4 px-4 py-4">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => router.push('/conversations/new')}
        >
          <Plus className="h-5 w-5" />
          New Conversation
        </Button>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Button
                key={item.name}
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => router.push(item.href)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Button>
            )
          })}
        </nav>
      </div>
    </div>
  )
} 