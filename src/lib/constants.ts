// Event details
export const EVENT = {
  name: 'Cape Town Halaal Lifestyle Expo 2026',
  shortName: 'Cape Town Halaal',
  tagline: 'South Africa\'s Largest Halaal Lifestyle Exhibition',
  dates: {
    start: new Date('2026-03-20'),
    end: new Date('2026-03-22'),
  },
  venue: {
    name: 'Green Point A Track',
    address: 'Green Point, Cape Town, South Africa',
  },
  stats: {
    vendors: '400+',
    days: '3',
    visitors: '50,000+',
    booths: '400',
  },
} as const;

// Contact info
export const CONTACT = {
  email: 'info@capetownhalaal.co.za',
  phone: '+27 21 555 0000',
  social: {
    facebook: 'https://www.facebook.com/globalcuisineco/',
    instagram: 'https://www.instagram.com/globalcuisineco/',
    linkedin: 'https://www.linkedin.com/company/85941152',
  },
} as const;

// Vendor categories
export const VENDOR_CATEGORIES = [
  { value: 'food-hot', label: 'Hot Food' },
  { value: 'food-sweet', label: 'Sweet Treats & Desserts' },
  { value: 'food-beverages', label: 'Beverages' },
  { value: 'food-snacks', label: 'Snacks' },
  { value: 'fashion-islamic', label: 'Islamic Fashion' },
  { value: 'fashion-general', label: 'General Clothing' },
  { value: 'fashion-accessories', label: 'Accessories' },
  { value: 'fashion-kids', label: "Children's Wear" },
  { value: 'home-decor', label: 'Home & Decor' },
  { value: 'home-crafts', label: 'Crafts & Handmade' },
  { value: 'beauty-wellness', label: 'Beauty & Wellness' },
  { value: 'books-education', label: 'Books & Education' },
  { value: 'tech-electronics', label: 'Tech & Electronics' },
  { value: 'charity', label: 'Charity & NPO' },
  { value: 'other', label: 'Other' },
] as const;

// Navigation
export const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Book a Booth', href: '/exhibitor' },
  { label: 'Vendors', href: '/vendors' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
] as const;

// Protected routes
export const PROTECTED_ROUTES = ['/dashboard', '/checkout'];
export const ADMIN_ROUTES = ['/admin'];
export const AUTH_ROUTES = ['/login', '/register'];
