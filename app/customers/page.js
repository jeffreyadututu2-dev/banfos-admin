'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Orders', href: '/orders' },
  { label: 'Products', href: '/products' },
  { label: 'Banners', href: '/banners' },
  { label: 'Customers', href: '/customers' },
  { label: 'Settings', href: '/settings' },
]

export default function CustomersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [consentFilter, setConsentFilter] = useState('All')

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    // Get all customer profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })

    if (!profiles) {
      setLoading(false)
      return
    }

    // Get all orders to compute per-customer stats
    const { data: orders } = await supabase
      .from('orders')
      .select('user_id, total, created_at')

    const withStats = profiles.map(profile => {
      const customerOrders = orders?.filter(o => o.user_id === profile.id) || []
      const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const lastOrderDate = customerOrders.length > 0
        ? customerOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at
        : null

      return {
        ...profile,
        orderCount: customerOrders.length,
        totalSpent,
        lastOrderDate,
      }
    })
    console.log('Profiles:', profiles)
    console.log('Orders:', orders)
    console.log('With Stats:', withStats)
    setCustomers(withStats)
    setLoading(false)
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !search ||
      customer.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchesConsent =
      consentFilter === 'All' ||
      (consentFilter === 'Subscribed' && customer.marketing_consent) ||
      (consentFilter === 'Not Subscribed' && !customer.marketing_consent)
    return matchesSearch && matchesConsent
  })

  const subscribedCount = customers.filter(c => c.marketing_consent).length

  return (
    <div className="min-h-screen bg-[#fff8f2] flex">

      {/* Sidebar */}
      <aside className="w-64 bg-[#1a0a00] min-h-screen p-6 flex flex-col">
        <h1 className="text-white font-bold text-xl mb-8">Banfos Admin</h1>
        <nav className="flex flex-col gap-2 flex-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 rounded-xl transition text-sm font-medium ${
                pathname === item.href
                  ? 'bg-[#f59b1e] text-[#1a0a00]'
                  : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-[#1a0a00] mb-2">Customers</h2>
        <p className="text-stone-400 text-sm mb-8">
          {customers.length} total · {subscribedCount} subscribed to marketing emails
        </p>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="flex gap-2">
            {['All', 'Subscribed', 'Not Subscribed'].map(filter => (
              <button
                key={filter}
                onClick={() => setConsentFilter(filter)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                  consentFilter === filter
                    ? 'bg-[#1a0a00] text-white'
                    : 'bg-white text-[#1a0a00] border border-stone-200 hover:border-[#f59b1e]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59b1e] w-full sm:w-64"
          />
        </div>

        {loading ? (
          <p className="text-stone-400">Loading customers...</p>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-stone-400">No customers found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Joined</th>
                  <th className="text-left px-6 py-3">Orders</th>
                  <th className="text-left px-6 py-3">Total Spent</th>
                  <th className="text-left px-6 py-3">Last Order</th>
                  <th className="text-left px-6 py-3">Marketing</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="border-t border-stone-100">
                    <td className="px-6 py-4 font-semibold text-[#1a0a00]">
                      {customer.full_name || 'Unnamed'}
                    </td>
                    <td className="px-6 py-4 text-stone-500">
                      {new Date(customer.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-stone-500">{customer.orderCount}</td>
                    <td className="px-6 py-4 text-[#1a0a00] font-semibold">
                      GHS {customer.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-stone-500">
                      {customer.lastOrderDate
                        ? new Date(customer.lastOrderDate).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        customer.marketing_consent
                          ? 'bg-green-100 text-green-700'
                          : 'bg-stone-100 text-stone-400'
                      }`}>
                        {customer.marketing_consent ? 'Subscribed' : 'Not Subscribed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}