'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
import Link from 'next/link'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Orders', href: '/orders' },
  { label: 'Products', href: '/products' },
  { label: 'Banners', href: '/banners' },
  { label: 'Customers', href: '/customers' },
  { label: 'Settings', href: '/settings' },
]

const CATEGORIES = ['Tote Bags', 'Purses', 'Clutches']

export default function EditProductPage({ params }) {
  const router = useRouter()
  const pathname = usePathname()
  const [productId, setProductId] = useState(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
  })
  const [mainImages, setMainImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [allTags, setAllTags] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])

  const [variants, setVariants] = useState([])

  useEffect(() => {
    async function resolveParams() {
      const resolved = await params
      setProductId(resolved.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!productId) return
    async function loadData() {
      const supabase = createClient()

      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (product) {
        setForm({
          name: product.name || '',
          description: product.description || '',
          price: product.price || '',
          category: product.category || '',
          stock: product.stock || '',
        })
        setMainImages(product.images || [])
      }

      const { data: tagsData } = await supabase.from('tags').select('*').order('category')
      if (tagsData) setAllTags(tagsData)

      const { data: productTags } = await supabase
        .from('product_tags')
        .select('tag_id')
        .eq('product_id', productId)
      if (productTags) setSelectedTagIds(productTags.map(t => t.tag_id))

      const { data: variantData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order')
      if (variantData) {
        setVariants(variantData.map(v => ({ ...v, uploading: false })))
      }

      setLoading(false)
    }
    loadData()
  }, [productId])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function toggleTag(tagId) {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  async function uploadFiles(files) {
    const supabase = createClient()
    const uploadedUrls = []

    for (const file of files) {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`
      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file)

      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
        uploadedUrls.push(data.publicUrl)
      }
    }

    return uploadedUrls
  }

  async function handleMainImageUpload(e) {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setUploading(true)
    const urls = await uploadFiles(files)
    setMainImages(prev => [...prev, ...urls])
    setUploading(false)
  }

  function removeMainImage(index) {
    setMainImages(mainImages.filter((_, i) => i !== index))
  }

  function addVariant() {
    setVariants([...variants, {
      id: null,
      color_name: '',
      color_hex: '#000000',
      stock: 0,
      images: [],
      uploading: false,
    }])
  }

  function updateVariant(index, field, value) {
    const updated = [...variants]
    updated[index][field] = value
    setVariants(updated)
  }

  async function handleVariantImageUpload(index, e) {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    const updated = [...variants]
    updated[index].uploading = true
    setVariants(updated)

    const urls = await uploadFiles(files)

    const finalUpdated = [...variants]
    finalUpdated[index].images = [...finalUpdated[index].images, ...urls]
    finalUpdated[index].uploading = false
    setVariants(finalUpdated)
  }

  function removeVariantImage(variantIndex, imageIndex) {
    const updated = [...variants]
    updated[variantIndex].images = updated[variantIndex].images.filter((_, i) => i !== imageIndex)
    setVariants(updated)
  }

  function removeVariant(index) {
    setVariants(variants.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.category || mainImages.length === 0) {
      alert('Please fill in name, price, category, and at least one product photo.')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const totalStock = variants.length > 0
      ? variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
      : Number(form.stock || 0)

    // Update the product itself
    const { error } = await supabase
      .from('products')
      .update({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        stock: totalStock,
        images: mainImages,
      })
      .eq('id', productId)

    if (error) {
      alert('Something went wrong saving the product.')
      setSaving(false)
      return
    }

    // Replace tags: delete existing, insert current selection
    await supabase.from('product_tags').delete().eq('product_id', productId)
    if (selectedTagIds.length > 0) {
      const tagRows = selectedTagIds.map(tagId => ({
        product_id: productId,
        tag_id: tagId,
      }))
      await supabase.from('product_tags').insert(tagRows)
    }

    // Replace variants: delete existing, insert current list
    await supabase.from('product_variants').delete().eq('product_id', productId)
    if (variants.length > 0) {
      const variantRows = variants.map((v, i) => ({
        product_id: productId,
        color_name: v.color_name,
        color_hex: v.color_hex,
        stock: Number(v.stock || 0),
        images: v.images,
        sort_order: i + 1,
      }))
      await supabase.from('product_variants').insert(variantRows)
    }

    router.push('/products')
  }

  async function handleDelete() {
    if (!confirm('Delete this product permanently? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', productId)
    router.push('/products')
  }

  const tagsByCategory = allTags.reduce((acc, tag) => {
    const cat = tag.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(tag)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff8f2] flex items-center justify-center">
        <p className="text-stone-400">Loading product...</p>
      </div>
    )
  }

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
      <main className="flex-1 p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/products" className="text-stone-400 hover:text-[#1a0a00]">
              ← Back
            </Link>
            <h2 className="text-2xl font-bold text-[#1a0a00]">Edit Product</h2>
          </div>
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-600 text-sm font-semibold"
          >
            Delete Product
          </button>
        </div>

        <div className="space-y-6">

          {/* Basic Info */}
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h3 className="font-bold text-[#1a0a00]">Basic Information</h3>

            <div>
              <label className="text-sm font-medium text-[#1a0a00] block mb-1">Product Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59b1e]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1a0a00] block mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59b1e]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1a0a00] block mb-1">Price (GHS)</label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59b1e]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1a0a00] block mb-1">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59b1e]"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {variants.length === 0 && (
              <div>
                <label className="text-sm font-medium text-[#1a0a00] block mb-1">Stock</label>
                <input
                  type="number"
                  name="stock"
                  value={form.stock}
                  onChange={handleChange}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59b1e]"
                />
                <p className="text-xs text-stone-400 mt-1">
                  Leave this and use color variants below if this product comes in multiple colors.
                </p>
              </div>
            )}
          </div>

          {/* Main Product Photos */}
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h3 className="font-bold text-[#1a0a00]">Product Photos</h3>

            <div className="flex flex-wrap gap-3">
              {mainImages.map((img, i) => (
                <div key={i} className="relative w-24 h-24">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-xl" />
                  <button
                    onClick={() => removeMainImage(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 border-2 border-dashed border-stone-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#f59b1e] transition">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  className="hidden"
                />
                <span className="text-stone-400 text-2xl">+</span>
              </label>
            </div>
            {uploading && <p className="text-xs text-stone-400">Uploading...</p>}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h3 className="font-bold text-[#1a0a00]">Tags</h3>
            {Object.entries(tagsByCategory).map(([category, tags]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-stone-400 uppercase mb-2">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                        selectedTagIds.includes(tag.id)
                          ? 'bg-[#1a0a00] text-white'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Color Variants */}
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1a0a00]">Color Variants</h3>
              <button
                onClick={addVariant}
                className="text-xs font-semibold text-[#f59b1e] hover:underline"
              >
                + Add Color
              </button>
            </div>

            {variants.length === 0 ? (
              <p className="text-sm text-stone-400">No color variants added. This product uses the stock field above.</p>
            ) : (
              <div className="space-y-4">
                {variants.map((variant, i) => (
                  <div key={variant.id || i} className="border border-stone-200 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="grid grid-cols-3 gap-3 flex-1">
                        <div>
                          <label className="text-xs font-medium text-[#1a0a00] block mb-1">Color Name</label>
                          <input
                            type="text"
                            value={variant.color_name}
                            onChange={(e) => updateVariant(i, 'color_name', e.target.value)}
                            placeholder="Brown"
                            className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#f59b1e]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[#1a0a00] block mb-1">Color Swatch</label>
                          <input
                            type="color"
                            value={variant.color_hex}
                            onChange={(e) => updateVariant(i, 'color_hex', e.target.value)}
                            className="w-full h-9 border border-stone-200 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[#1a0a00] block mb-1">Stock</label>
                          <input
                            type="number"
                            value={variant.stock}
                            onChange={(e) => updateVariant(i, 'stock', e.target.value)}
                            placeholder="10"
                            className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#f59b1e]"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeVariant(i)}
                        className="text-red-400 hover:text-red-600 text-xs font-semibold ml-3 mt-5"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Variant Photos */}
                    <div>
                      <label className="text-xs font-medium text-[#1a0a00] block mb-1">Photos for this color</label>
                      <div className="flex flex-wrap gap-2">
                        {variant.images.map((img, imgI) => (
                          <div key={imgI} className="relative w-16 h-16">
                            <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                            <button
                              onClick={() => removeVariantImage(i, imgI)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <label className="w-16 h-16 border-2 border-dashed border-stone-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#f59b1e] transition">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleVariantImageUpload(i, e)}
                            className="hidden"
                          />
                          <span className="text-stone-400 text-lg">+</span>
                        </label>
                      </div>
                      {variant.uploading && <p className="text-xs text-stone-400 mt-1">Uploading...</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#1a0a00] text-white py-4 rounded-full font-bold hover:bg-[#f59b1e] hover:text-[#1a0a00] transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

        </div>
      </main>
    </div>
  )
}