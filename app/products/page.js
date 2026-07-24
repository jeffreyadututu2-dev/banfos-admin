'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import AdminSidebar from '../components/AdminSidebar'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setProducts(data)
    setLoading(false)
  }

  async function toggleActive(product) {
    setUpdatingId(product.id)
    const supabase = createClient()
    await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)

    setProducts(products.map(p =>
      p.id === product.id ? { ...p, is_active: !p.is_active } : p
    ))
    setUpdatingId(null)
  }

  async function deleteProduct(productId) {
    if (!confirm('Delete this product permanently? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', productId)
    setProducts(products.filter(p => p.id !== productId))
  }

  const filteredProducts = products.filter(product =>
    !search || product.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#fff8f2] flex flex-col sm:flex-row">

      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-bold text-[#1a0a00]">Products</h2>
          <Link
            href="/products/new"
            className="bg-[#1a0a00] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#f59b1e] hover:text-[#1a0a00] transition text-center"
          >
            + Add Product
          </Link>
        </div>

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59b1e] w-full sm:w-72 mb-6"
        />

        {loading ? (
          <p className="text-stone-400">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-stone-400">No products found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-stone-50 text-stone-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">Product</th>
                  <th className="text-left px-6 py-3">Category</th>
                  <th className="text-left px-6 py-3">Price</th>
                  <th className="text-left px-6 py-3">Stock</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id} className="border-t border-stone-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images?.[0]}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <span className="font-semibold text-[#1a0a00]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-stone-500">{product.category}</td>
                    <td className="px-6 py-4 text-[#1a0a00] font-semibold">GHS {product.price}</td>
                    <td className="px-6 py-4">
                      <span className={product.stock < 5 ? 'text-red-500 font-semibold' : 'text-stone-500'}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(product)}
                        disabled={updatingId === product.id}
                        className={`text-xs font-semibold px-3 py-1 rounded-full transition disabled:opacity-50 ${
                          product.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-stone-200 text-stone-500 hover:bg-stone-300'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Sold Out'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/products/${product.id}`}
                          className="text-[#f59b1e] hover:underline text-xs font-semibold"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="text-red-400 hover:text-red-600 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
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