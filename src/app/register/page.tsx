'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useBoothStore } from '@/lib/store'
import { registerUser, validateEmail, validatePhone } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2, Mail, Lock, User, Building, Phone, AlertCircle, Check } from 'lucide-react'
import { LogoMark } from '@/components/logo'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useBoothStore()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Valid email is required'
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required'
    }

    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Valid phone number is required'
    }

    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsLoading(true)

    try {
      const result = await registerUser({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        company: formData.company,
        phone: formData.phone
      })

      if (result.success && result.user) {
        register(result.user)
        router.push('/')
      } else {
        setErrors({ submit: result.error || 'Registration failed' })
      }
    } catch {
      setErrors({ submit: 'An error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const inputFields = [
    { id: 'name', label: 'Full Name', icon: User, type: 'text', placeholder: 'John Doe' },
    { id: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'you@company.com' },
    { id: 'company', label: 'Company Name', icon: Building, type: 'text', placeholder: 'Your Company Ltd' },
    { id: 'phone', label: 'Phone Number', icon: Phone, type: 'tel', placeholder: '+27 12 345 6789' },
    { id: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: '••••••••' },
    { id: 'confirmPassword', label: 'Confirm Password', icon: Lock, type: 'password', placeholder: '••••••••' }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNCAyNnYtMkgxNnYyaDE4ek0zMCAyMnYtMkgxOHYyaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="bg-gray-900/50 border-white/10 backdrop-blur-xl">
          <CardHeader className="space-y-1 text-center">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-4 transition-colors self-start"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to floor plan
            </Link>

            <div className="mx-auto mb-4">
              <LogoMark size="xl" />
            </div>

            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Register to book your booth at Young at Heart Festival
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errors.submit && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.submit}
                </motion.div>
              )}

              {inputFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <div className="relative">
                    <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formData[field.id as keyof typeof formData]}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className={`pl-10 bg-white/5 border-white/10 ${errors[field.id] ? 'border-red-500' : ''}`}
                      required
                    />
                    {formData[field.id as keyof typeof formData] && !errors[field.id] && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {errors[field.id] && (
                    <p className="text-xs text-red-400">{errors[field.id]}</p>
                  )}
                </div>
              ))}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-[#cd2653] hover:bg-[#bf3026]"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>

              <Separator className="bg-white/10" />

              <p className="text-sm text-gray-400 text-center">
                Already have an account?{' '}
                <Link href="/login" className="text-[#cd2653] hover:text-[#bf3026] font-medium">
                  Sign in
                </Link>
              </p>

            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
