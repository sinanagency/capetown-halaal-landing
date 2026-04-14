const WC_BASE = 'https://tickets.youngatheart.co.za/wp-json/wc/v3'
const WC_KEY = process.env.WC_CONSUMER_KEY || ''
const WC_SECRET = process.env.WC_CONSUMER_SECRET || ''

interface WCOrderLineItem {
  id: number
  name: string
  product_id: number
  quantity: number
  subtotal: string
  total: string
  price: number
}

export interface WCOrder {
  id: number
  status: string
  currency: string
  total: string
  date_created: string
  date_modified: string
  billing: {
    first_name: string
    last_name: string
    email: string
    phone: string
    city: string
    state: string
    country: string
  }
  payment_method: string
  payment_method_title: string
  line_items: WCOrderLineItem[]
  customer_id: number
  transaction_id: string
}

export interface WCProduct {
  id: number
  name: string
  price: string
  total_sales: number
  stock_quantity: number | null
  status: string
}

async function wcFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${WC_BASE}${endpoint}`)
  url.searchParams.set('consumer_key', WC_KEY)
  url.searchParams.set('consumer_secret', WC_SECRET)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString(), {
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`WooCommerce API error: ${res.status}`)
  }

  return res.json()
}

export async function getOrders(params: Record<string, string> = {}): Promise<WCOrder[]> {
  return wcFetch<WCOrder[]>('/orders', { per_page: '100', ...params })
}

export async function getOrdersCount(): Promise<number> {
  const res = await fetch(`${WC_BASE}/reports/orders/totals?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) return 0
  const data = await res.json()
  return data.reduce((sum: number, item: { total: number }) => sum + item.total, 0)
}

export async function getProducts(): Promise<WCProduct[]> {
  return wcFetch<WCProduct[]>('/products', { per_page: '20' })
}

export async function getTicketStats() {
  const [orders, failedOrders, pendingOrders, products] = await Promise.all([
    getOrders({ status: 'completed' }),
    getOrders({ status: 'failed' }),
    getOrders({ status: 'pending,on-hold,cancelled' }),
    getProducts(),
  ])

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total), 0)
  const totalTickets = orders.reduce((sum, o) => {
    return sum + o.line_items.reduce((s, item) => s + item.quantity, 0)
  }, 0)

  // Breakdown by ticket type
  const ticketBreakdown: Record<string, { qty: number; revenue: number }> = {}
  for (const order of orders) {
    for (const item of order.line_items) {
      if (!ticketBreakdown[item.name]) {
        ticketBreakdown[item.name] = { qty: 0, revenue: 0 }
      }
      ticketBreakdown[item.name].qty += item.quantity
      ticketBreakdown[item.name].revenue += parseFloat(item.total)
    }
  }

  // Sales by date (last 30 days)
  const salesByDate: Record<string, { orders: number; revenue: number; tickets: number }> = {}
  for (const order of orders) {
    const date = order.date_created.split('T')[0]
    if (!salesByDate[date]) {
      salesByDate[date] = { orders: 0, revenue: 0, tickets: 0 }
    }
    salesByDate[date].orders++
    salesByDate[date].revenue += parseFloat(order.total)
    salesByDate[date].tickets += order.line_items.reduce((s, item) => s + item.quantity, 0)
  }

  return {
    totalRevenue,
    totalTickets,
    totalOrders: orders.length,
    ticketBreakdown,
    salesByDate,
    recentOrders: orders.slice(0, 10),
    failedOrders: failedOrders.map(o => ({
      id: o.id,
      status: o.status,
      total: o.total,
      date_created: o.date_created,
      billing: o.billing,
      line_items: o.line_items,
      payment_method_title: o.payment_method_title,
    })),
    pendingOrders: pendingOrders.map(o => ({
      id: o.id,
      status: o.status,
      total: o.total,
      date_created: o.date_created,
      billing: o.billing,
      line_items: o.line_items,
      payment_method_title: o.payment_method_title,
    })),
    failedCount: failedOrders.length,
    pendingCount: pendingOrders.length,
  }
}
