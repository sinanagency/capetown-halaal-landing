// Cape Town Halaal 2025 Site Map Data
// Based on official site map

export type BoothStatus = 'available' | 'reserved' | 'sold'
export type BoothCategory = 'food' | 'drinks' | 'fashion' | 'beauty' | 'home' | 'kids' | 'islamic' | 'services' | 'carnival'

export interface Booth {
  id: string
  number: string
  name: string
  category: BoothCategory
  status: BoothStatus
  size: '3x3' | '3x6' | '6x6' | '6x9' | 'custom'
  price: number
  x: number
  y: number
  width: number
  height: number
  section: string
}

export interface Section {
  id: string
  name: string
  color: string
  x: number
  y: number
  width: number
  height: number
}

// Sections of the venue
export const SECTIONS: Section[] = [
  { id: 'food-left', name: 'Food Court Left', color: '#f97316', x: 0, y: 100, width: 80, height: 400 },
  { id: 'food-right', name: 'Food Court Right', color: '#f97316', x: 920, y: 100, width: 80, height: 400 },
  { id: 'carnival', name: 'Carnival & Entertainment', color: '#eab308', x: 200, y: 0, width: 600, height: 200 },
  { id: 'drinks', name: 'Drinks Zone', color: '#3b82f6', x: 350, y: 220, width: 150, height: 100 },
  { id: 'kids', name: 'Kids Zone', color: '#ec4899', x: 80, y: 520, width: 400, height: 80 },
  { id: 'main-hall', name: 'Main Exhibition Hall', color: '#8b5cf6', x: 80, y: 620, width: 840, height: 280 },
  { id: 'salaah', name: 'Salaah Facilities', color: '#10b981', x: 80, y: 920, width: 200, height: 60 },
  { id: 'entrance', name: 'Entrance', color: '#ef4444', x: 700, y: 920, width: 200, height: 60 },
]

// Food vendors - Left side (1-14)
const FOOD_LEFT: Partial<Booth>[] = [
  { number: '1', name: 'Krispy Corn Dog', category: 'food' },
  { number: '2', name: 'Cophia Coffee Co', category: 'drinks' },
  { number: '3', name: 'Dumpling Girl', category: 'food' },
  { number: '4', name: 'Salty Shack', category: 'food' },
  { number: '5', name: 'BobaLicious', category: 'drinks' },
  { number: '6', name: 'Happy Hour', category: 'drinks' },
  { number: '7', name: 'Prawn Star', category: 'food' },
  { number: '8', name: 'Kulfi Krush & That Kebab!', category: 'food' },
  { number: '9', name: 'Stubborn Monkey', category: 'food' },
  { number: '10', name: 'The Wokness Monster', category: 'food' },
  { number: '11', name: 'The Wok Bar', category: 'food' },
  { number: '12', name: 'Al Mashawi', category: 'food' },
  { number: '13', name: 'Durban Indian Cuisine', category: 'food' },
  { number: '14', name: 'Salt and Pepper', category: 'food' },
]

// Food vendors - Right side (36-50)
const FOOD_RIGHT: Partial<Booth>[] = [
  { number: '50', name: 'Sweet and Sour Sensations', category: 'food' },
  { number: '49', name: "Bil's - Brother in Laws", category: 'food' },
  { number: '48', name: 'El Chapo Mexican', category: 'food' },
  { number: '47', name: 'Ciao Pizza', category: 'food' },
  { number: '46', name: 'SubHub', category: 'food' },
  { number: '45', name: 'Its SnackTime', category: 'food' },
  { number: '44', name: 'Partystarters', category: 'food' },
  { number: '43', name: 'Bottoms Up Coffee Co', category: 'drinks' },
  { number: '42', name: 'Joe & Co', category: 'drinks' },
  { number: '41', name: 'Habibi Java Kitchen', category: 'food' },
  { number: '40', name: 'Bali Food Truck', category: 'food' },
  { number: '39', name: 'CHAAT-URI', category: 'food' },
  { number: '38', name: 'C&F Fresh Fruits', category: 'food' },
  { number: '37', name: 'Papa Chai', category: 'drinks' },
  { number: '36', name: 'Corn in a Cup', category: 'food' },
]

// Food vendors - Bottom left (15-21)
const FOOD_BOTTOM: Partial<Booth>[] = [
  { number: '15', name: 'SIBS | Tacos', category: 'food' },
  { number: '16', name: 'Talladega Grill', category: 'food' },
  { number: '17', name: 'Call-A-Braai', category: 'food' },
  { number: '18', name: 'L.A. FARMS', category: 'food' },
  { number: '19', name: 'Foodhangover', category: 'food' },
  { number: '20', name: 'Xtreme iScream', category: 'food' },
  { number: '21', name: 'Whisked by Saabirah', category: 'food' },
]

// Desserts & Drinks (22-35)
const DESSERTS: Partial<Booth>[] = [
  { number: '22', name: 'Naughty Berry', category: 'food' },
  { number: '23', name: 'The Pancake Mechanic', category: 'food' },
  { number: '24', name: 'Kunafe', category: 'food' },
  { number: '25', name: 'Obsessioncpt', category: 'food' },
  { number: '26', name: 'Twinkle Pop', category: 'food' },
  { number: '27', name: 'Island Way Sorbet', category: 'food' },
  { number: '28', name: 'Little Lemons', category: 'drinks' },
  { number: '29', name: 'Pineapple Express', category: 'drinks' },
  { number: '30', name: 'Treacle and Tart', category: 'food' },
  { number: '31', name: 'Twilight Bakehouse', category: 'food' },
  { number: '32', name: 'Le Sucre Artisanal Treats', category: 'food' },
  { number: '33', name: 'House of Halwa', category: 'food' },
  { number: '34', name: 'Butterybliss', category: 'food' },
  { number: '35', name: 'Zaytoon', category: 'food' },
]

// Kids Zone vendors
const KIDS_ZONE: Partial<Booth>[] = [
  { number: 'K1', name: 'Firfirey Toys', category: 'kids' },
  { number: 'K2', name: 'Kieyams Toys', category: 'kids' },
  { number: 'K3', name: 'All Time Favorites', category: 'kids' },
  { number: 'K4', name: 'Berani Events', category: 'kids' },
  { number: 'K5', name: 'Doe & Co', category: 'kids' },
  { number: 'K6', name: 'Creative Potentials', category: 'kids' },
  { number: 'K7', name: 'S.A Facepaint', category: 'kids' },
  { number: 'K8', name: 'Cuddlepals', category: 'kids' },
  { number: 'K9', name: 'The Flower Sisters', category: 'kids' },
  { number: 'K10', name: 'Rainbow Rhino Glitter', category: 'kids' },
  { number: 'K11', name: 'Mehndi by Amani', category: 'beauty' },
  { number: 'K12', name: 'Mehndi by Malika', category: 'beauty' },
  { number: 'K13', name: 'Art By E', category: 'kids' },
  { number: 'K14', name: 'Double Trouble Toys', category: 'kids' },
]

// Main Hall - Row A (Fashion & Islamic)
const MAIN_ROW_A: Partial<Booth>[] = [
  { number: 'A1', name: 'Elegant Muslimah', category: 'fashion' },
  { number: 'A2', name: 'Elegant Muslimah', category: 'fashion' },
  { number: 'A3', name: 'The Hijaabi Boutique', category: 'fashion' },
  { number: 'A4', name: 'Africa Muslims Agency', category: 'islamic' },
  { number: 'A5', name: 'Africa Muslims Agency', category: 'islamic' },
  { number: 'A6', name: 'Islamic Relief SA', category: 'islamic' },
  { number: 'A7', name: 'Mustaqim Modest Menswear', category: 'fashion' },
  { number: 'A8', name: 'Shamillas Fashions', category: 'fashion' },
  { number: 'A9', name: 'Shamillas Fashions', category: 'fashion' },
  { number: 'A10', name: 'NUBSKIN', category: 'beauty' },
  { number: 'A11', name: 'Akasia Distributors', category: 'services' },
  { number: 'A12', name: 'Arabica Coffee', category: 'food' },
]

// Main Hall - Row B (Food Products)
const MAIN_ROW_B: Partial<Booth>[] = [
  { number: 'B1', name: 'Barfi Bliss', category: 'food' },
  { number: 'B2', name: 'Royal Nuts', category: 'food' },
  { number: 'B3', name: 'Vanilla Cream', category: 'food' },
  { number: 'B4', name: 'Relish Inc.', category: 'food' },
  { number: 'B5', name: 'The Velvet Crumb', category: 'food' },
  { number: 'B6', name: 'Magic Print', category: 'services' },
  { number: 'B7', name: 'The Popcorn Cartel', category: 'food' },
  { number: 'B8', name: 'Cookie Lookie', category: 'food' },
  { number: 'B9', name: 'Angelpie Cakes & Crumbs', category: 'food' },
  { number: 'B10', name: 'Doki Doki', category: 'food' },
  { number: 'B11', name: 'Crawfords Biltong', category: 'food' },
  { number: 'B12', name: 'Filigrana', category: 'fashion' },
]

// Main Hall - Row C (Beauty & Home)
const MAIN_ROW_C: Partial<Booth>[] = [
  { number: 'C1', name: "Shaamila's Cakery", category: 'food' },
  { number: 'C2', name: "Shaamila's Cakery", category: 'food' },
  { number: 'C3', name: "Punch'D", category: 'food' },
  { number: 'C4', name: 'Fragrances by Naz', category: 'beauty' },
  { number: 'C5', name: 'Melonscape', category: 'home' },
  { number: 'C6', name: 'Mysilverlove', category: 'fashion' },
  { number: 'C7', name: "Maddy's Home & Décor", category: 'home' },
  { number: 'C8', name: 'Forever Natural', category: 'beauty' },
  { number: 'C9', name: 'Tranquility Art', category: 'home' },
  { number: 'C10', name: 'Exclusive Gifting', category: 'home' },
  { number: 'C11', name: 'ITOUCH SA', category: 'services' },
  { number: 'C12', name: 'Dollhouse Boutique', category: 'fashion' },
]

// Main Hall - Row D (Fashion & Beauty)
const MAIN_ROW_D: Partial<Booth>[] = [
  { number: 'D1', name: "Senaa's Kitchen", category: 'food' },
  { number: 'D2', name: "Senaa's Kitchen", category: 'food' },
  { number: 'D3', name: 'Sataari', category: 'fashion' },
  { number: 'D4', name: 'Chateau Sucre', category: 'food' },
  { number: 'D5', name: 'The Agents', category: 'services' },
  { number: 'D6', name: 'The Agents', category: 'services' },
  { number: 'D7', name: 'Luxe Moments', category: 'home' },
  { number: 'D8', name: "Ranaa's Choc Ganache", category: 'food' },
  { number: 'D9', name: 'The Plug Fragrances', category: 'beauty' },
  { number: 'D10', name: 'SS Traders', category: 'services' },
  { number: 'D11', name: 'iSupplyZA', category: 'services' },
  { number: 'D12', name: 'Mimi Designs', category: 'fashion' },
]

// Main Hall - Row E
const MAIN_ROW_E: Partial<Booth>[] = [
  { number: 'E1', name: 'GA Toffee Apples', category: 'food' },
  { number: 'E2', name: 'Hellopay', category: 'services' },
  { number: 'E3', name: 'Exclusive Hijabs', category: 'fashion' },
  { number: 'E4', name: 'Exclusive Hijabs', category: 'fashion' },
  { number: 'E5', name: 'Frullato', category: 'food' },
  { number: 'E6', name: 'Koco and Design', category: 'home' },
  { number: 'E7', name: 'AMK Legend', category: 'fashion' },
  { number: 'E8', name: 'AMK Legend', category: 'fashion' },
  { number: 'E9', name: 'Tupperware', category: 'home' },
  { number: 'E10', name: 'Pink Hanger', category: 'fashion' },
  { number: 'E11', name: 'Chapter 96 Bookz', category: 'islamic' },
  { number: 'E12', name: 'Faya Cotton', category: 'fashion' },
]

// Main Hall - Row F
const MAIN_ROW_F: Partial<Booth>[] = [
  { number: 'F1', name: 'Perfect Pair Shoe Boutique', category: 'fashion' },
  { number: 'F2', name: 'The Towel Factory Shop', category: 'home' },
  { number: 'F3', name: 'The Scarf Lab', category: 'fashion' },
  { number: 'F4', name: 'Precious Jewels', category: 'fashion' },
  { number: 'F5', name: 'THOBED', category: 'fashion' },
  { number: 'F6', name: 'Purple & Prose', category: 'home' },
  { number: 'F7', name: 'MyBeautyRoks', category: 'beauty' },
  { number: 'F8', name: 'Clutch Closet', category: 'fashion' },
  { number: 'F9', name: 'Baitul Hikmah Cape Town', category: 'islamic' },
  { number: 'F10', name: 'Primal Wellness', category: 'beauty' },
  { number: 'F11', name: 'N&Z BAZAAR', category: 'fashion' },
  { number: 'F12', name: 'Dollhouse Boutique', category: 'fashion' },
]

// Main Hall - Row G
const MAIN_ROW_G: Partial<Booth>[] = [
  { number: 'G1', name: 'Oh So Coco Beauty', category: 'beauty' },
  { number: 'G2', name: 'The Towel Factory', category: 'home' },
  { number: 'G3', name: 'LP Wear', category: 'fashion' },
  { number: 'G4', name: 'Henna by Imaan', category: 'beauty' },
  { number: 'G5', name: 'Alchemist Perfumes', category: 'beauty' },
  { number: 'G6', name: 'SOAPRETTY', category: 'beauty' },
  { number: 'G7', name: 'Fair Properties', category: 'services' },
  { number: 'G8', name: 'Wood and Things CPT', category: 'home' },
  { number: 'G9', name: 'SugaMama', category: 'food' },
  { number: 'G10', name: 'Shameemas', category: 'food' },
  { number: 'G11', name: "Maimoonah's Bakery", category: 'food' },
  { number: 'G12', name: 'Solo Style', category: 'fashion' },
]

// Main Hall - Row H
const MAIN_ROW_H: Partial<Booth>[] = [
  { number: 'H1', name: 'Youghazi Fragrance', category: 'beauty' },
  { number: 'H2', name: "Rae's Collection", category: 'fashion' },
  { number: 'H3', name: "Rae's Collection", category: 'fashion' },
  { number: 'H4', name: 'Africa Wellness', category: 'beauty' },
  { number: 'H5', name: 'Turkish Grand Bazaar', category: 'home' },
  { number: 'H6', name: 'Shundurr Creations', category: 'fashion' },
  { number: 'H7', name: 'LS Clothing', category: 'fashion' },
  { number: 'H8', name: 'The Creative Hub', category: 'services' },
  { number: 'H9', name: 'SD Hoodies', category: 'fashion' },
  { number: 'H10', name: 'Splash Wear CPT', category: 'fashion' },
  { number: 'H11', name: 'Cellxpress', category: 'services' },
  { number: 'H12', name: 'The Craft Trio', category: 'home' },
]

// Main Hall - Row I
const MAIN_ROW_I: Partial<Booth>[] = [
  { number: 'I1', name: 'Mr Clearance', category: 'services' },
  { number: 'I2', name: "G's Boutique", category: 'fashion' },
  { number: 'I3', name: 'Occasions Gifts', category: 'home' },
  { number: 'I4', name: 'Husnaa', category: 'fashion' },
  { number: 'I5', name: 'LABELED BY LAILAA', category: 'fashion' },
  { number: 'I6', name: 'KOSU', category: 'fashion' },
  { number: 'I7', name: 'Lafrique Officiel', category: 'fashion' },
  { number: 'I8', name: 'Jellybabes Inc', category: 'kids' },
  { number: 'I9', name: 'ROSENSE SA', category: 'beauty' },
  { number: 'I10', name: 'ROSENSE SA', category: 'beauty' },
  { number: 'I11', name: 'Zayo Stock', category: 'fashion' },
  { number: 'I12', name: 'Zayo Stock', category: 'fashion' },
]

// Main Hall - Row J
const MAIN_ROW_J: Partial<Booth>[] = [
  { number: 'J1', name: 'Positive Affirmations', category: 'home' },
  { number: 'J2', name: 'Zayaan Wellness', category: 'beauty' },
  { number: 'J3', name: 'Candles and Things', category: 'home' },
  { number: 'J4', name: 'Candles and Things', category: 'home' },
  { number: 'J5', name: 'MAY SABLAY', category: 'fashion' },
  { number: 'J6', name: 'Pretty Things', category: 'fashion' },
  { number: 'J7', name: 'Nisa Gaibie', category: 'fashion' },
  { number: 'J8', name: 'Nisa Gaibie', category: 'fashion' },
  { number: 'J9', name: 'Oh So Coco Beauty', category: 'beauty' },
  { number: 'J10', name: 'Kitchen Saam', category: 'home' },
  { number: 'J11', name: 'Violet Designz', category: 'fashion' },
  { number: 'J12', name: 'Secret Footcare', category: 'beauty' },
]

// Carnival attractions
const CARNIVAL: Partial<Booth>[] = [
  { number: 'CAR1', name: 'McGregors Petting Zoo', category: 'carnival' },
  { number: 'CAR2', name: 'Horse Rides', category: 'carnival' },
  { number: 'CAR3', name: 'Carnival Tickets', category: 'carnival' },
  { number: 'CAR4', name: 'Ferris Wheel', category: 'carnival' },
  { number: 'CAR5', name: 'Carousel', category: 'carnival' },
  { number: 'CAR6', name: 'Bouncy Castle', category: 'carnival' },
]

// Helper function to generate booth with position
function generateBooth(
  partial: Partial<Booth>,
  section: string,
  x: number,
  y: number,
  width: number = 60,
  height: number = 40,
  status: BoothStatus = 'sold'
): Booth {
  return {
    id: `${section}-${partial.number}`,
    number: partial.number || '',
    name: partial.name || 'Available',
    category: partial.category || 'services',
    status,
    size: '3x3',
    price: partial.category === 'food' ? 8500 : 6500,
    x,
    y,
    width,
    height,
    section,
  }
}

// Generate all booths with positions
export function generateAllBooths(): Booth[] {
  const booths: Booth[] = []

  // Food Left (vertical column)
  FOOD_LEFT.forEach((booth, i) => {
    booths.push(generateBooth(booth, 'food-left', 10, 120 + i * 35, 70, 30))
  })

  // Food Right (vertical column)
  FOOD_RIGHT.forEach((booth, i) => {
    booths.push(generateBooth(booth, 'food-right', 920, 120 + i * 35, 70, 30))
  })

  // Food Bottom
  FOOD_BOTTOM.forEach((booth, i) => {
    booths.push(generateBooth(booth, 'food-bottom', 100 + i * 80, 520, 75, 35))
  })

  // Desserts
  DESSERTS.forEach((booth, i) => {
    booths.push(generateBooth(booth, 'desserts', 100 + i * 60, 560, 55, 35))
  })

  // Kids Zone
  KIDS_ZONE.forEach((booth, i) => {
    booths.push(generateBooth(booth, 'kids', 100 + i * 60, 600, 55, 35))
  })

  // Main Hall Rows
  const mainRows = [
    { data: MAIN_ROW_A, y: 650 },
    { data: MAIN_ROW_B, y: 690 },
    { data: MAIN_ROW_C, y: 730 },
    { data: MAIN_ROW_D, y: 770 },
    { data: MAIN_ROW_E, y: 810 },
    { data: MAIN_ROW_F, y: 850 },
    { data: MAIN_ROW_G, y: 890 },
    { data: MAIN_ROW_H, y: 930 },
    { data: MAIN_ROW_I, y: 970 },
    { data: MAIN_ROW_J, y: 1010 },
  ]

  mainRows.forEach(row => {
    row.data.forEach((booth, i) => {
      booths.push(generateBooth(booth, 'main-hall', 100 + i * 70, row.y, 65, 35))
    })
  })

  // Carnival
  CARNIVAL.forEach((booth, i) => {
    booths.push(generateBooth(booth, 'carnival', 300 + i * 100, 80, 90, 60))
  })

  return booths
}

// Category colors
export const CATEGORY_COLORS: Record<BoothCategory, string> = {
  food: '#f97316',
  drinks: '#3b82f6',
  fashion: '#ec4899',
  beauty: '#a855f7',
  home: '#14b8a6',
  kids: '#f472b6',
  islamic: '#10b981',
  services: '#6b7280',
  carnival: '#eab308',
}

// Category labels
export const CATEGORY_LABELS: Record<BoothCategory, string> = {
  food: 'Food & Beverages',
  drinks: 'Drinks',
  fashion: 'Fashion & Clothing',
  beauty: 'Beauty & Wellness',
  home: 'Home & Décor',
  kids: 'Kids & Toys',
  islamic: 'Islamic Products',
  services: 'Services',
  carnival: 'Carnival & Entertainment',
}

export const ALL_BOOTHS = generateAllBooths()
