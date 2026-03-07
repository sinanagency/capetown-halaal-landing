// Simple auth utilities for demo purposes
// In production, replace with NextAuth.js + Supabase

import { User } from './store'

// Demo users database (in-memory for demo)
const DEMO_USERS: Record<string, User & { password: string; role: 'admin' | 'exhibitor' }> = {
  'admin': {
    id: '0',
    email: 'admin',
    name: 'Administrator',
    company: 'Cape Town Halaal Expo',
    phone: '+27 21 555 0000',
    password: 'admin123',
    role: 'admin'
  },
  'demo@example.com': {
    id: '1',
    email: 'demo@example.com',
    name: 'Demo User',
    company: 'Demo Company',
    phone: '+27 123 456 789',
    password: 'demo123',
    role: 'exhibitor'
  },
  'samreen@globalcuisine.co.za': {
    id: '2',
    email: 'samreen@globalcuisine.co.za',
    name: 'Samreen Kumandan',
    company: 'Global Cuisine',
    phone: '+27 21 555 0000',
    password: 'admin123',
    role: 'admin'
  }
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  company: string
  phone: string
}

export async function loginUser(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  const user = DEMO_USERS[credentials.email.toLowerCase()]

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  if (user.password !== credentials.password) {
    return { success: false, error: 'Invalid password' }
  }

  const { password, ...userWithoutPassword } = user
  return { success: true, user: userWithoutPassword }
}

export async function registerUser(data: RegisterData): Promise<{ success: boolean; user?: User; error?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  if (DEMO_USERS[data.email.toLowerCase()]) {
    return { success: false, error: 'Email already registered' }
  }

  const newUser: User = {
    id: Date.now().toString(),
    email: data.email.toLowerCase(),
    name: data.name,
    company: data.company,
    phone: data.phone
  }

  // In demo, we'll just return success (no persistence)
  return { success: true, user: newUser }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone: string): boolean {
  return /^[\d\s\-+()]{10,}$/.test(phone)
}
