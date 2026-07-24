'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import AdminSidebar from '../components/AdminSidebar'

export default function Dashboard() {
  const router = useRouter()
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
      <div className="min-h-screen bg-[#fff8f2] flex items-center justify-center">
        <p className="text-stone-400">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fff8f2] flex flex-col sm:flex-row">

      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-[#1a0a00]">Dashboard</h2>
          <button
            onClick={handleSignOut}
            className="text-stone-400 hover:text-[#1a0a00] text-sm font-medium"
          >
            Sign Out
          </button>
        </div>

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