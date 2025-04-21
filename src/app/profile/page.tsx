'use client'

import { useEffect, useState } from 'react'
import { useProfileStore } from '@/lib/stores/useProfileStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Camera } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { profile, isLoading, error, fetchProfile, updateProfile, uploadAvatar } = useProfileStore()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await updateProfile({ full_name: fullName })
      toast.success('Profile updated', {
        description: 'Your profile has been updated successfully.',
      })
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to update profile',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await uploadAvatar(file)
      toast.success('Avatar updated', {
        description: 'Your avatar has been updated successfully.',
      })
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to upload avatar',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <Label
                  htmlFor="avatar"
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    id="avatar"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="sr-only"
                  />
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Click the camera icon to update your avatar
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 