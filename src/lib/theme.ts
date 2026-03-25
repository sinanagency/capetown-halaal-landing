// Young at Heart Festival - Brand Theme
// Based on Global Cuisine branding

export const theme = {
  colors: {
    // Primary - Deep Red/Maroon (Global Cuisine accent)
    primary: {
      50: '#fdf2f4',
      100: '#fce7ea',
      200: '#f9d0d7',
      300: '#f4a9b6',
      400: '#ec7a8f',
      500: '#cd2653', // Main brand red
      600: '#bf3026',
      700: '#a12a2a',
      800: '#872626',
      900: '#722525',
      950: '#3f0f10',
    },
    // Secondary - Gold/Amber for premium accents
    secondary: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    // Neutral - Black/White/Gray (Global Cuisine base)
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
    // Accent - Beige (Global Cuisine subtle background)
    beige: '#dcd7ca',
  },
  fonts: {
    heading: 'var(--font-heading)', // Will use a serif font
    body: 'var(--font-body)', // Clean sans-serif
  },
}

// Event Information
export const eventInfo = {
  name: 'Young at Heart Festival',
  tagline: "South Africa's Largest Lifestyle Exhibition",
  year: 2026,
  dates: 'December 11-13, 2026',
  duration: '3 Days',
  venue: {
    name: 'Youngsfield Military Base',
    city: 'Cape Town',
    country: 'South Africa',
    capacity: '20,000m²',
  },
  stats: {
    exhibitors: 264,
    expectedVisitors: 25000,
    exhibitionSpace: 20000,
    days: 3,
    countries: 15,
  },
  organizer: {
    name: 'Samreen Kumandan',
    company: 'Global Cuisine',
    website: 'https://globalcuisine.co.za',
  },
  social: {
    instagram: 'https://www.instagram.com/youngatheart_capetown/',
    facebook: 'https://www.facebook.com/globalcuisineco/',
    twitter: '#',
    linkedin: '#',
  },
}

// Booth tiers with new color scheme
export const boothTierColors = {
  '3x2': '#3b82f6', // Blue - Standard
  '3x3': '#22c55e', // Green - Medium
  '4x4': '#f59e0b', // Amber - Large
  '6x6': '#cd2653', // Brand Red - Premium
}

// Sponsor tiers
export const sponsorTiers = [
  { name: 'Platinum', color: '#e5e4e2', benefits: ['Prime booth location', 'Main stage branding', 'VIP lounge access', 'Full media coverage'] },
  { name: 'Gold', color: '#ffd700', benefits: ['Featured booth', 'Stage mentions', 'Media coverage'] },
  { name: 'Silver', color: '#c0c0c0', benefits: ['Standard booth', 'Directory listing', 'Social media mention'] },
]
