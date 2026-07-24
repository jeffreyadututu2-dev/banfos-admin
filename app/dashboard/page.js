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

export default function Dashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    lowStockProducts: [],
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        router.push('/login')
        return
      }

      const { data: orders } = await supabase.from('orders').select('*')
      const { data: customers } = await supabase.from('profiles').select('*').eq('role', 'customer')
      const { data: lowStock } = await supabase.from('products').select('*').lt('stock', 5).eq('is_active', true)
      const { data: recent } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5)

      const revenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0

      setStats({
        totalOrders: orders?.length || 0,
        totalRevenue: revenue,
        totalCustomers: customers?.length || 0,
        lowStockProducts: lowStock || [],
      })
      setRecentOrders(recent || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8f2] flex items-center justify-center">
        <p className="text-stone-400">Loading dashboard...</p>
      </main>
    )
  }

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
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 text-stone-400 hover:text-white text-sm mt-4 text-left px-4 py-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-[#1a0a00] mb-8">Dashboard</h2>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Orders', value: stats.totalOrders },
            { label: 'Total Revenue', value: `GHS ${stats.totalRevenue.toFixed(2)}` },
            { label: 'Total Customers', value: stats.totalCustomers },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl shadow p-6">
              <p className="text-stone-400 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-[#1a0a00]">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#1a0a00]">Recent Orders</h3>
              <Link href="/orders" className="text-[#f59b1e] text-sm hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <p className="text-stone-400 text-sm">No orders yet.</p>
              ) : recentOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center text-sm border-b pb-3">
                  <div>
                    <p className="font-mono text-xs text-stone-400">{order.payment_reference}</p>
                    <p className="font-semibold text-[#1a0a00]">GHS {order.total?.toFixed(2)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    order.status === 'paid' ? 'bg-green-100 text-green-700' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'delivered' ? 'bg-purple-100 text-purple-700' :
                    'bg-stone-100 text-stone-500'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#1a0a00]">Low Stock Alerts</h3>
              <Link href="/products" className="text-[#f59b1e] text-sm hover:underline">Manage</Link>
            </div>
            <div className="space-y-3">
              {stats.lowStockProducts.length === 0 ? (
                <p className="text-stone-400 text-sm">All products are well stocked.</p>
              ) : stats.lowStockProducts.map(product => (
                <div key={product.id} className="flex justify-between items-center text-sm border-b pb-3">
                  <p className="font-semibold text-[#1a0a00]">{product.name}</p>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-600">
                    {product.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}