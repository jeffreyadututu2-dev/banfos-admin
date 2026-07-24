'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    ),
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9m-9-4h4" />
      </svg>
    ),
  },
  {
    label: 'Products',
    href: '/products',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Banners',
    href: '/banners',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v10H4V5zm0 0l8 6 8-6M4 19h16" />
      </svg>
    ),
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-6a4 4 0 11-4-4 4 4 0 014 4zm6 4a4 4 0 10-4-4" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const STATUS_FILTERS = ['All', 'pending', 'paid', 'shipped', 'delivered']

export default function OrdersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    loadOrders()

    const supabase = createClient()
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadOrders() {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setOrders(data)
    setLoading(false)
  }

  async function updateStatus(orderId, newStatus) {
    setUpdatingId(orderId)
    const supabase = createClient()
    await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
     if (newStatus === 'delivered') {
    try {
      await fetch('/api/send-review-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
    } catch (err) {
      console.error('Failed to send review email:', err)
    }
  }
    setUpdatingId(null)
  }

  const filteredOrders = orders.filter(order => {
    const matchesFilter = activeFilter === 'All' || order.status === activeFilter
    const matchesSearch = !search ||
      order.payment_reference?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#fff8f2] flex">

      {/* Sidebar */}
      <aside className="w-64 bg-[#1a0a00] min-h-screen p-6 flex flex-col">
        <h1 className="text-white font-bold text-xl mb-8">Banfos Admin</h1>
        <nav className="flex flex-col gap-2 flex-1">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                  isActive
                    ? 'bg-[#f59b1e] text-[#1a0a00]'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-[#1a0a00] mb-8">Orders</h2>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(status => (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition ${
                  activeFilter === status
                    ? 'bg-[#1a0a00] text-white'
                    : 'bg-white text-[#1a0a00] border border-stone-200 hover:border-[#f59b1e]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59b1e] w-full sm:w-64"
          />
        </div>

        {/* Orders List */}
        {loading ? (
          <p className="text-stone-400">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-stone-400">No orders found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl shadow p-6">
                <div
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 cursor-pointer"
                >
                  <div>
                    <p className="font-mono text-xs text-stone-400 mb-1">{order.payment_reference}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(order.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                      order.status === 'paid' ? 'bg-green-100 text-green-700' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'delivered' ? 'bg-purple-100 text-purple-700' :
                      'bg-stone-100 text-stone-500'
                    }`}>
                      {order.status}
                    </span>
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      disabled={updatingId === order.id}
                      className="text-xs border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#f59b1e] disabled:opacity-50"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                {expandedId === order.id && (
                  <>
                    {/* Items */}
                    <div className="border-t pt-4 space-y-2">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm text-stone-600">
                          <span>{item.name} x {item.quantity}</span>
                          <span>GHS {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-3 pt-3 flex justify-between font-bold text-[#1a0a00] text-sm">
                      <span>Total</span>
                      <span>GHS {order.total?.toFixed(2)}</span>
                    </div>

                    {/* Delivery Info */}
                    {order.delivery_address && (
                      <div className="border-t mt-3 pt-3 text-sm text-stone-500">
                        <p className="font-semibold text-[#1a0a00] mb-1">Delivery Details</p>
                        <p>{order.delivery_address.fullName}</p>
                        <p>{order.delivery_address.email}</p>
                        <p>{order.delivery_address.phone}</p>
                        <p>{order.delivery_address.address}, {order.delivery_address.city}, {order.delivery_address.region}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}