'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import AdminSidebar from '../components/AdminSidebar'

const STATUS_FILTERS = ['All', 'pending', 'paid', 'shipped', 'delivered']

export default function OrdersPage() {
  const router = useRouter()
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
    <div className="min-h-screen bg-[#fff8f2] flex flex-col sm:flex-row">

      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8">
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