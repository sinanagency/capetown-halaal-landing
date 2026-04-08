'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useBoothStore } from '@/lib/store'
import { formatPrice, BOOTH_TIERS } from '@/lib/booth-data'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  CreditCard,
  Lock,
  CheckCircle2,
  Clock,
  Shield,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '@/components/analytics-tracker'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated, cart, getCartTotal, clearCart } = useBoothStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'eft'>('card')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
    if (cart.length === 0 && !isComplete) {
      router.push('/')
    }
  }, [isAuthenticated, cart.length, router, isComplete])

  // Track checkout start
  useEffect(() => {
    if (isAuthenticated && cart.length > 0) {
      track('checkout_start', { metadata: { items: cart.length, total: getCartTotal() } })
    }
  }, [])

  const total = getCartTotal()
  const vat = total * 0.15
  const grandTotal = total + vat

  const handleCheckout = async () => {
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    setIsProcessing(false)
    setIsComplete(true)
    track('checkout_complete', { metadata: { total: grandTotal, method: paymentMethod } })

    // Clear cart after successful payment
    setTimeout(() => {
      clearCart()
    }, 1000)
  }

  if (!isAuthenticated || !user) {
    return null
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <main className="pt-20 pb-12 px-4 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-gray-400 mb-8 max-w-md">
              Your booth reservation has been confirmed. You will receive a confirmation email shortly.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/dashboard">
                <Button className="bg-green-600 hover:bg-green-700">
                  View Dashboard
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">
                  Back to Floor Plan
                </Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to floor plan
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Payment form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-3"
            >
              <Card className="bg-gray-900/50 border-white/10">
                <CardHeader>
                  <CardTitle>Checkout</CardTitle>
                  <CardDescription>Complete your booth reservation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Timer warning */}
                  <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-sm text-amber-400 font-medium">Booths held for 15 minutes</p>
                      <p className="text-xs text-amber-400/70">Complete payment to confirm your reservation</p>
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="space-y-3">
                    <Label>Payment Method</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={cn(
                          'p-4 rounded-lg border transition-all text-left',
                          paymentMethod === 'card'
                            ? 'bg-white/10 border-green-500'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        )}
                      >
                        <CreditCard className="w-6 h-6 mb-2 text-white" />
                        <p className="font-medium text-white">Card Payment</p>
                        <p className="text-xs text-gray-400">Visa, Mastercard, Amex</p>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('eft')}
                        className={cn(
                          'p-4 rounded-lg border transition-all text-left',
                          paymentMethod === 'eft'
                            ? 'bg-white/10 border-green-500'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        )}
                      >
                        <Shield className="w-6 h-6 mb-2 text-white" />
                        <p className="font-medium text-white">EFT / Bank Transfer</p>
                        <p className="text-xs text-gray-400">Direct bank payment</p>
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'card' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Card Number</Label>
                        <Input
                          placeholder="4242 4242 4242 4242"
                          defaultValue="4242 4242 4242 4242"
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Expiry Date</Label>
                          <Input
                            placeholder="MM/YY"
                            defaultValue="12/28"
                            className="bg-white/5 border-white/10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>CVC</Label>
                          <Input
                            placeholder="123"
                            defaultValue="123"
                            className="bg-white/5 border-white/10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cardholder Name</Label>
                        <Input
                          placeholder="Name on card"
                          defaultValue={user.name}
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                      <p className="text-sm text-gray-400">
                        Please use the following details for your EFT payment:
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Bank:</span>
                          <span className="text-white">First National Bank</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Account Name:</span>
                          <span className="text-white">Young at Heart Festival</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Account Number:</span>
                          <span className="text-white font-mono">62123456789</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Branch Code:</span>
                          <span className="text-white font-mono">250655</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Reference:</span>
                          <span className="text-white font-mono">CTH-{user.id.slice(0, 6)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-amber-400">
                        Please email proof of payment to payments@capetownhalaal.co.za
                      </p>
                    </div>
                  )}

                  {/* Billing info */}
                  <Separator className="bg-white/10" />

                  <div className="space-y-4">
                    <Label className="text-base">Billing Information</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-400">Name</Label>
                        <Input
                          defaultValue={user.name}
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-400">Company</Label>
                        <Input
                          defaultValue={user.company}
                          className="bg-white/5 border-white/10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-400">Email</Label>
                      <Input
                        defaultValue={user.email}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 h-12"
                    onClick={handleCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Pay {formatPrice(grandTotal)}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Order summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              <Card className="bg-gray-900/50 border-white/10 sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.map((booth) => {
                    const tier = BOOTH_TIERS[booth.size]
                    return (
                      <div key={booth.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">
                            Booth {booth.row}{booth.column}
                          </p>
                          <p className="text-xs text-gray-500">{tier.label}</p>
                        </div>
                        <span className="text-white">{formatPrice(booth.price)}</span>
                      </div>
                    )
                  })}

                  <Separator className="bg-white/10" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="text-white">{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">VAT (15%)</span>
                      <span className="text-white">{formatPrice(vat)}</span>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-green-400">{formatPrice(grandTotal)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-4">
                    <Shield className="w-4 h-4" />
                    <span>Secure checkout powered by Stripe</span>
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
