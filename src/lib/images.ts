// Curated Unsplash images for Cape Town Halaal Festival
// Using Unsplash Source API for high-quality, relevant images

export const IMAGES = {
  // Hero backgrounds
  hero: {
    main: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=80', // Food spread
    overlay: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=80', // Food platter
  },

  // Food images
  food: {
    kebab: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80',
    biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80',
    sweets: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800&q=80',
    coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    samosa: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80',
    curry: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
  },

  // Festival/Market images
  festival: {
    market1: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&q=80', // Market stalls
    market2: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80', // Food market
    crowd: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80', // Event crowd
    stall: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80', // Food stall
    lights: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', // Festival lights
  },

  // Cape Town
  capeTown: {
    mountain: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80', // Table Mountain
    city: 'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=800&q=80', // Cape Town cityscape
    waterfront: 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=800&q=80', // V&A Waterfront
  },

  // Fashion
  fashion: {
    hijab: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800&q=80',
    modest: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80',
    accessories: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=800&q=80',
  },

  // Patterns and textures
  patterns: {
    islamic: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800&q=80', // Islamic pattern
    geometric: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', // Geometric
  },

  // Placeholder for vendors without images
  placeholder: {
    food: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
    fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
    general: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80',
  },
} as const;

// Gallery images for showcasing the festival
export const GALLERY_IMAGES = [
  {
    src: IMAGES.food.kebab,
    alt: 'Delicious halaal kebabs',
    category: 'Food',
  },
  {
    src: IMAGES.food.biryani,
    alt: 'Authentic biryani',
    category: 'Food',
  },
  {
    src: IMAGES.festival.market1,
    alt: 'Vibrant market stalls',
    category: 'Festival',
  },
  {
    src: IMAGES.food.sweets,
    alt: 'Traditional sweets',
    category: 'Food',
  },
  {
    src: IMAGES.festival.stall,
    alt: 'Food vendor stall',
    category: 'Festival',
  },
  {
    src: IMAGES.food.coffee,
    alt: 'Artisan coffee',
    category: 'Beverages',
  },
  {
    src: IMAGES.festival.lights,
    alt: 'Festival atmosphere',
    category: 'Festival',
  },
  {
    src: IMAGES.food.curry,
    alt: 'Aromatic curry dishes',
    category: 'Food',
  },
];
