import { create } from 'zustand'

interface BreadcrumbState {
  subPage: string
  setSubPage: (page: string) => void
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  subPage: 'Operational',
  setSubPage: (page) => set({ subPage: page }),
}))
