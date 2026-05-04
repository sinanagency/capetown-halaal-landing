'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search, Store, Utensils, Shirt, Coffee, Gift, Star, CheckCircle, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VENDOR_CATEGORIES } from '@/lib/constants';
import { IMAGES } from '@/lib/images';
import { Logo } from '@/components/logo';

// Sample vendors with images (in production, this would come from the database)
const DEMO_VENDORS = [
  { name: 'Arabica Coffee', category: 'food-beverages', confirmed: true, image: IMAGES.food.coffee },
  { name: 'The Hijaabi Boutique', category: 'fashion-islamic', confirmed: true, image: IMAGES.fashion.hijab },
  { name: 'Barfi Bliss', category: 'food-sweet', confirmed: true, image: IMAGES.food.sweets },
  { name: 'Durban Indian Cuisine', category: 'food-hot', confirmed: true, image: IMAGES.food.curry },
  { name: 'Cookie Lookie', category: 'food-sweet', confirmed: true, image: IMAGES.food.sweets },
  { name: 'Ciao Pizza', category: 'food-hot', confirmed: true, image: IMAGES.placeholder.food },
  { name: 'BobaLicious', category: 'food-beverages', confirmed: true, image: IMAGES.food.coffee },
  { name: 'Elegant Muslimah', category: 'fashion-islamic', confirmed: true, image: IMAGES.fashion.modest },
  { name: 'Candles and Things', category: 'home-decor', confirmed: true, image: IMAGES.placeholder.general },
  { name: 'Africa Muslims Agency', category: 'charity', confirmed: true, image: IMAGES.placeholder.general },
  { name: 'Crawfords Biltong', category: 'food-snacks', confirmed: true, image: IMAGES.food.kebab },
  { name: 'Clutch Closet', category: 'fashion-accessories', confirmed: true, image: IMAGES.fashion.accessories },
];

const categoryIcons: Record<string, typeof Utensils> = {
  'food-hot': Utensils,
  'food-sweet': Gift,
  'food-beverages': Coffee,
  'food-snacks': Utensils,
  'fashion-islamic': Shirt,
  'fashion-accessories': Gift,
  'home-decor': Gift,
  charity: Star,
};

export default function VendorsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredVendors = DEMO_VENDORS.filter((vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || vendor.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (categoryValue: string) => {
    return VENDOR_CATEGORIES.find((c) => c.value === categoryValue)?.label || categoryValue;
  };

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || Store;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link href="/">
              <Logo size="md" showText={true} />
            </Link>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/exhibitor')}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#cd2653] to-[#bf3026] rounded-xl shadow-lg shadow-[#cd2653]/20 cursor-pointer"
              >
                Book Booth
                <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header with Background Image */}
      <section className="relative overflow-hidden pt-20 border-b border-white/5">
        <div className="absolute inset-0">
          <Image
            src={IMAGES.festival.stall}
            alt="Festival vendors"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/90 via-neutral-950/80 to-neutral-950" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cd2653]/30 bg-[#cd2653]/10 px-4 py-2">
              <Store className="h-4 w-4 text-[#cd2653]" />
              <span className="text-sm text-[#cd2653]">350+ Vendors Confirmed</span>
            </div>
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              Our{' '}
              <span className="bg-gradient-to-r from-[#cd2653] to-[#f59e0b] bg-clip-text text-transparent">
                Vendors
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-300">
              Discover the amazing vendors who will be exhibiting at Young at Heart Festival.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="border-b border-white/5 bg-neutral-900/50 py-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="Search vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-white/10 bg-neutral-900 pl-9 focus:border-[#cd2653]/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategory === null ? 'default' : 'outline'}
                className={`cursor-pointer transition-all ${
                  selectedCategory === null
                    ? 'bg-gradient-to-r from-[#cd2653] to-[#bf3026] text-white border-0'
                    : 'border-white/20 text-neutral-400 hover:border-[#cd2653]/50 hover:text-[#cd2653]'
                }`}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Badge>
              {VENDOR_CATEGORIES.slice(0, 5).map((category) => (
                <Badge
                  key={category.value}
                  variant={selectedCategory === category.value ? 'default' : 'outline'}
                  className={`cursor-pointer transition-all ${
                    selectedCategory === category.value
                      ? 'bg-gradient-to-r from-[#cd2653] to-[#bf3026] text-white border-0'
                      : 'border-white/20 text-neutral-400 hover:border-[#cd2653]/50 hover:text-[#cd2653]'
                  }`}
                  onClick={() => setSelectedCategory(category.value)}
                >
                  {category.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vendor Grid */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {filteredVendors.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#cd2653]/10">
                <Store className="h-8 w-8 text-[#cd2653]" />
              </div>
              <p className="text-lg text-neutral-400">No vendors found matching your criteria.</p>
              <p className="mt-2 text-sm text-neutral-500">Try adjusting your search or filters.</p>
            </motion.div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVendors.map((vendor, index) => {
                const Icon = getCategoryIcon(vendor.category);
                return (
                  <motion.div
                    key={vendor.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="group h-full overflow-hidden bg-neutral-900/50 border-white/5 transition-all hover:border-[#cd2653]/50 hover:shadow-xl hover:shadow-[#cd2653]/5">
                      <div className="relative h-40 overflow-hidden">
                        <Image
                          src={vendor.image}
                          alt={vendor.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#cd2653] to-[#bf3026] shadow-lg">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        {vendor.confirmed && (
                          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-1 text-xs font-medium text-white">
                            <CheckCircle className="h-3 w-3" />
                            Confirmed
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-white">{vendor.name}</h3>
                        <p className="mt-1 text-sm text-neutral-400">
                          {getCategoryLabel(vendor.category)}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cd2653]/30 bg-[#cd2653]/10 px-6 py-3">
              <Star className="h-4 w-4 text-[#cd2653]" />
              <span className="text-sm text-neutral-400">
                Showing {filteredVendors.length} of {DEMO_VENDORS.length} confirmed vendors.{' '}
                <span className="text-[#cd2653]">More vendors will be announced soon!</span>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden border-t border-white/5 py-20">
        <div className="absolute inset-0">
          <Image
            src={IMAGES.festival.market1}
            alt="Festival market"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/90 to-neutral-950/95" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white">Want to Be a Vendor?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-neutral-300">
              Join over 350 vendors at Cape Town's premier lifestyle festival. Book your booth today
              and showcase your products to thousands of visitors.
            </p>
            <div className="mt-8">
              <Link
                href="/exhibitor"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#cd2653] to-[#bf3026] px-8 py-4 font-semibold text-white shadow-lg shadow-[#cd2653]/25 transition-all hover:shadow-xl hover:shadow-[#cd2653]/30"
              >
                <Store className="h-5 w-5" />
                Book Your Booth
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 bg-neutral-950">
        <div className="container mx-auto px-4 text-center">
          <p className="text-neutral-600 text-sm">
            © 2026 Young at Heart Festival. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
