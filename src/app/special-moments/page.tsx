import { SpecialMoments } from '@/components/SpecialMoments'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Special Moments | AI Girlfriend',
  description: 'Celebrate special moments with your AI partner',
}

export default function SpecialMomentsPage() {
  return (
    <div className="container py-10">
      <SpecialMoments />
    </div>
  )
} 