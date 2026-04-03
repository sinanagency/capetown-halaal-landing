'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useBoothStore } from '@/lib/store'
import { formatPrice, BOOTH_TIERS } from '@/lib/booth-data'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  MapPin,
  ShoppingCart,
  Calendar,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

// Mock bookings data for demo
const MOCK_BOOKINGS = [
  {
    id: '1',
    boothId: 'booth-5-10',
    boothNumber: 'F11',
    size: '3x3' as const,
    price: 2800,
    status: 'confirmed',
    bookedAt: new Date('2024-01-15'),
    eventDate: new Date('2024-06-15')
  },
  {
    id: '2',
    boothId: 'booth-8-8',
    boothNumber: 'I9',
    size: '4x4' as const,
    price: 5200,
    status: 'pending',
    bookedAt: new Date('2024-01-20'),
    eventDate: new Date('2024-06-15')
  }
]

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, cart } = useBoothStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) {
    return null
  }

  const statusConfig = {
    confirmed: { icon: CheckCircle2, color: 'text-green-400 bg-green-500/20', label: 'Confirmed' },
    pending: { icon: Clock, color: 'text-amber-400 bg-amber-500/20', label: 'Pending Payment' },
    cancelled: { icon: AlertCircle, color: 'text-red-400 bg-red-500/20', label: 'Cancelled' }
  }

  const totalSpent = MOCK_BOOKINGS
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.price, 0)

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Welcome header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            <p className="text-gray-400">
              Manage your booth bookings for Young at Heart Festival 2026
            </p>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          >
            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Bookings</p>
                    <p className="text-2xl font-bold text-white">{MOCK_BOOKINGS.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Confirmed</p>
                    <p className="text-2xl font-bold text-green-400">
                      {MOCK_BOOKINGS.filter(b => b.status === 'confirmed').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">In Cart</p>
                    <p className="text-2xl font-bold text-amber-400">{cart.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Invested</p>
                    <p className="text-2xl font-bold text-white">{formatPrice(totalSpent)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bookings list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Your Bookings</CardTitle>
                      <CardDescription>View and manage your booth reservations</CardDescription>
                    </div>
                    <Link href="/">
                      <Button variant="outline" size="sm" className="gap-2">
                        <MapPin className="w-4 h-4" />
                        Book More
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {MOCK_BOOKINGS.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">No bookings yet</p>
                      <Link href="/">
                        <Button>Browse Floor Plan</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {MOCK_BOOKINGS.map((booking, index) => {
                        const tier = BOOTH_TIERS[booking.size]
                        const status = statusConfig[booking.status as keyof typeof statusConfig]
                        const StatusIcon = status.icon

                        return (
                          <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-bold">{booking.boothNumber}</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">Booth {booking.boothNumber}</span>
                                  <Badge variant="outline" className="text-[10px]">{tier.label}</Badge>
                                </div>
                                <p className="text-sm text-gray-500">
                                  Booked on {booking.bookedAt.toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold text-white">{formatPrice(booking.price)}</p>
                                <Badge className={`${status.color} text-[10px]`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </div>
                              <Button variant="ghost" size="icon">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              {/* Event info */}
              <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-400" />
                    Event Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Event</p>
                    <p className="font-semibold text-white">Young at Heart Festival 2026</p>
                  </div>
                  <Separator className="bg-white/10" />
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p className="font-semibold text-white">11-13 December 2026</p>
                  </div>
                  <Separator className="bg-white/10" />
                  <div>
                    <p className="text-sm text-gray-400">Venue</p>
                    <p className="font-semibold text-white">Youngsfield Military Base</p>
                    <p className="text-sm text-gray-500">Wetton Road, Wynberg, Cape Town</p>
                  </div>
                  <Separator className="bg-white/10" />
                  <div>
                    <p className="text-sm text-gray-400">Organizer</p>
                    <p className="font-semibold text-white">Samreen Kumandan</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => toast.info('Coming Soon', { description: 'Invoice download will be available after payment.' })}
                  >
                    <Download className="w-4 h-4" />
                    Download Invoice
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => toast.info('Coming Soon', { description: 'Guidelines will be sent to exhibitors closer to the event.' })}
                  >
                    <FileText className="w-4 h-4" />
                    Exhibitor Guidelines
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => toast.info('Coming Soon', { description: 'Venue map will be available after booking.' })}
                  >
                    <MapPin className="w-4 h-4" />
                    Venue Map
                  </Button>
                </CardContent>
              </Card>

              {/* Account info */}
              <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="text-white">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Company</p>
                    <p className="text-white">{user.company}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="text-white">{user.phone}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
