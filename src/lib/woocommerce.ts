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
  if (!WC_KEY || !WC_SECRET) {
    throw new Error('WooCommerce credentials missing. Set WC_CONSUMER_KEY and WC_CONSUMER_SECRET.')
  }

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
    const body = await res.text().catch(() => 'no body')
    console.error(`WooCommerce API error: ${res.status} ${endpoint}`, body)
    throw new Error(`WooCommerce API error: ${res.status} on ${endpoint}`)
  }

  return res.json()
}

// Doctrine Law 6: every orders.list call MUST carry `after=` scoped to the
// current festival cycle, or it silently includes last year's data.
const FESTIVAL_CYCLE_AFTER = '2026-01-01T00:00:00'

// Audit finding #16: getOrders previously fetched only the first 100 orders,
// which silently truncated ticket dashboards once sales crossed 100 in week 1.
// Now paginates with `page=` until the response is shorter than per_page.
export async function getOrders(params: Record<string, string> = {}): Promise<WCOrder[]> {
  const perPage = 100
  const merged: Record<string, string> = { after: FESTIVAL_CYCLE_AFTER, ...params, per_page: String(perPage) }
  const all: WCOrder[] = []
  for (let page = 1; page <= 50; page++) { // hard cap at 5000 orders so a runaway loop never hangs
    const batch = await wcFetch<WCOrder[]>('/orders', { ...merged, page: String(page) })
    all.push(...batch)
    if (batch.length < perPage) break
  }
  return all
}

// Audit finding #16: /reports/orders/totals returns all-time data with no
// date filter (the endpoint doesn't accept `after=`). For festival-cycle
// counts, paginate through /orders with the cycle filter and sum.
export async function getOrdersCount(): Promise<number> {
  const orders = await getOrders({ status: 'completed,processing,on-hold,pending' })
  return orders.length
}

export async function getProducts(): Promise<WCProduct[]> {
  return wcFetch<WCProduct[]>('/products', { per_page: '20' })
}

export async function getTicketStats() {
  // Only fetch 2026 event orders (filters out last year's festival)
  const after = '2026-01-01T00:00:00'
  const [orders, failedOrders, pendingOrders, products] = await Promise.all([
    getOrders({ status: 'completed', after }),
    getOrders({ status: 'failed', after }),
    getOrders({ status: 'pending,on-hold,cancelled', after }),
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
