import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CashierSession, Cashier } from '@/types'

interface SessionStore {
  session: CashierSession | null
  cashier: Cashier | null
  setSession: (session: CashierSession, cashier: Cashier) => void
  clearSession: () => void
  isLoggedIn: () => boolean
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      session: null,
      cashier: null,

      setSession: (session: CashierSession, cashier: Cashier) => {
        set({ session, cashier })
      },

      clearSession: () => {
        set({ session: null, cashier: null })
      },

      isLoggedIn: () => {
        const s = get().session
        return s !== null && s.status === 'OPEN'
      },
    }),
    {
      name: 'durenucok-session',
    }
  )
)
