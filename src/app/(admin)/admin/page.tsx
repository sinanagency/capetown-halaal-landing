'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { StatsCard } from '@/components/admin/StatsCard'
import { ApplicationCard } from '@/components/admin/ApplicationCard'
import type { VendorApplication } from '@/lib/supabase/types'
import { FileText, CheckCircle, Clock, XCircle, ArrowRight, Loader2 } from 'lucide-react'

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
  info_requested: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentApplications, setRecentApplications] = useState<VendorApplication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch stats
        const statsRes = await fetch('/api/admin/stats')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.stats)
        }

        // Fetch recent applications
        const appsRes = await fetch('/api/applications?status=pending')
        if (appsRes.ok) {
          const appsData = await appsRes.json()
          setRecentApplications(appsData.applications.slice(0, 5))
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500">Overview of vendor applications</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Applications"
          value={stats?.total || 0}
          icon={<FileText className="w-6 h-6" />}
        />
        <StatsCard
          title="Pending Review"
          value={stats?.pending || 0}
          icon={<Clock className="w-6 h-6" />}
          className="border-amber-200"
        />
        <StatsCard
          title="Approved"
          value={stats?.approved || 0}
          icon={<CheckCircle className="w-6 h-6" />}
          className="border-green-200"
        />
        <StatsCard
          title="Rejected"
          value={stats?.rejected || 0}
          icon={<XCircle className="w-6 h-6" />}
          className="border-red-200"
        />
      </div>

      {/* Recent Pending Applications */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-neutral-900">Pending Applications</h2>
          <Link
            href="/admin/applications?status=pending"
            className="text-sm text-[#cd2653] hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pending applications</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recentApplications.map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
