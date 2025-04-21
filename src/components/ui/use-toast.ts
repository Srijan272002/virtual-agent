import { create } from 'zustand'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: Math.random().toString(36).substr(2, 9) },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export function useToast() {
  const { addToast, removeToast } = useToastStore()

  return {
    toast: (props: Omit<Toast, 'id'>) => {
      const id = addToast(props)
      if (props.duration !== Infinity) {
        setTimeout(() => {
          removeToast(id as unknown as string)
        }, props.duration || 5000)
      }
    },
    dismiss: (toastId: string) => removeToast(toastId),
  }
} 