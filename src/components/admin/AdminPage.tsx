'use client'

import { AdminPageHeader } from './AdminPageHeader'

interface AdminPageProps {
  caption?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function AdminPage({ caption, title, subtitle, actions, children }: AdminPageProps) {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <AdminPageHeader caption={caption} title={title} subtitle={subtitle} actions={actions} />
      {children}
    </div>
  )
}
