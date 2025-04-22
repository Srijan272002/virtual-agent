import { useEffect, useState } from 'react'
import { useConversationStore } from '@/lib/stores/useConversationStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Bell, BellOff } from 'lucide-react'

export function ReminderSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const { 
    interactionPatterns, 
    checkReminders,
    togglePatternReminder 
  } = useConversationStore()
  
  useEffect(() => {
    // Check notification permission status
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
    
    // Set up periodic reminder checks
    const checkInterval = setInterval(() => {
      checkReminders()
    }, 60000) // Check every minute
    
    return () => clearInterval(checkInterval)
  }, [checkReminders])
  
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications')
      return
    }
    
    try {
      const permission = await Notification.requestPermission()
      setNotificationsEnabled(permission === 'granted')
      
      if (permission === 'granted') {
        new Notification('Notifications Enabled', {
          body: 'You will now receive reminders for your interactions',
          icon: '/favicon.ico'
        })
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    }
  }
  
  const activeReminders = interactionPatterns.filter(
    pattern => pattern.active && pattern.reminderEnabled
  )
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminder Settings</CardTitle>
        <CardDescription>
          Manage your interaction reminders and notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Desktop Notifications</h4>
            <p className="text-sm text-muted-foreground">
              {notificationsEnabled
                ? 'You will receive desktop notifications for reminders'
                : 'Enable desktop notifications to receive reminders'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={requestNotificationPermission}
            disabled={notificationsEnabled}
          >
            {notificationsEnabled ? (
              <Bell className="h-4 w-4 text-green-500" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Active Reminders</h4>
          {activeReminders.length > 0 ? (
            <div className="space-y-2">
              {activeReminders.map(pattern => (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <h5 className="font-medium">{pattern.title}</h5>
                    <p className="text-sm text-muted-foreground">
                      {pattern.type === 'daily' ? 'Daily' : `Every ${pattern.day}`}
                      {pattern.time && ` at ${pattern.time}`}
                      {pattern.reminderTime && ` (${pattern.reminderTime} min reminder)`}
                    </p>
                  </div>
                  <Switch
                    checked={pattern.reminderEnabled}
                    onCheckedChange={() => togglePatternReminder(pattern.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active reminders. Enable reminders in your interaction patterns.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 