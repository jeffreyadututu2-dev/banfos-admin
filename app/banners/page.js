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

export default function BannersPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [announcement, setAnnouncement] = useState(null)
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    const { data: announcementData } = await supabase
      .from('announcement_strip')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (announcementData) setAnnouncement(announcementData)

    const { data: bannerData } = await supabase
      .from('promo_banners')
      .select('*')
      .order('sort_order')

    if (bannerData) setBanners(bannerData)

    setLoading(false)
  }

  function updateAnnouncementField(field, value) {
    setAnnouncement({ ...announcement, [field]: value })
  }

  async function saveAnnouncement() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('announcement_strip')
      .update({
        message: announcement.message,
        is_active: announcement.is_active,
        bg_color: announcement.bg_color,
        text_color: announcement.text_color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', announcement.id)
    setSaving(false)
  }

  function updateBannerField(id, field, value) {
    setBanners(banners.map(b => b.id === id ? { ...b, [field]: value } : b))
  }

  async function saveBanner(banner) {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('promo_banners')
      .update({
        label: banner.label,
        heading: banner.heading,
        bg_color: banner.bg_color,
        text_color: banner.text_color,
        button_text: banner.button_text,
        button_link: banner.button_link,
        is_active: banner.is_active,
      })
      .eq('id', banner.id)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff8f2] flex items-center justify-center">
        <p className="text-stone-400">Loading...</p>
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
        <h2 className="text-2xl font-bold text-[#1a0a00] mb-8">Banners</h2>

        {/* Announcement Strip */}
        {announcement && (
          <div className="bg-white rounded-2xl shadow p-6 mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1a0a00]">Announcement Strip</h3>
              <button
                onClick={() => updateAnnouncementField('is_active', !announcement.is_active)}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full transition ${
                  announcement.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                {announcement.is_active ? 'Active' : 'Hidden'}
              </button>
            </div>
            <p className="text-xs text-stone-400">
              A thin strip that appears under the navbar on every page. Use it for announcements like free delivery or sale periods.
            </p>

            <div>
              <label className="text-sm font-medium text-[#1a0a00] block mb-1">Message</label>
              <input
                type="text"
                value={announcement.message}
                onChange={(e) => updateAnnouncementField('message', e.target.value)}
                placeholder="Free delivery on all orders over GHS 500!"
                className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59b1e]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1a0a00] block mb-1">Background Color</label>
                <input
                  type="color"
                  value={announcement.bg_color}
                  onChange={(e) => updateAnnouncementField('bg_color', e.target.value)}
                  className="w-full h-10 border border-stone-200 rounded-xl cursor-pointer"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1a0a00] block mb-1">Text Color</label>
                <input
                  type="color"
                  value={announcement.text_color}
                  onChange={(e) => updateAnnouncementField('text_color', e.target.value)}
                  className="w-full h-10 border border-stone-200 rounded-xl cursor-pointer"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <p className="text-xs font-medium text-stone-400 mb-1">Preview</p>
              <div
                className="text-center text-sm font-medium py-2 px-4 rounded-lg"
                style={{ backgroundColor: announcement.bg_color, color: announcement.text_color }}
              >
                {announcement.message || 'Your announcement will appear here'}
              </div>
            </div>

            <button
              onClick={saveAnnouncement}
              disabled={saving}
              className="bg-[#1a0a00] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#f59b1e] hover:text-[#1a0a00] transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Announcement'}
            </button>
          </div>
        )}

        {/* Homepage Promo Banners */}
        <div className="space-y-4">
          <h3 className="font-bold text-[#1a0a00]">Homepage Promo Banners</h3>
          <p className="text-xs text-stone-400 -mt-2">
            The 3 promotional cards shown below the New Arrivals section on the homepage.
          </p>

          {banners.map(banner => (
            <div key={banner.id} className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1a0a00]">Banner {banner.sort_order}</p>
                <button
                  onClick={() => updateBannerField(banner.id, 'is_active', !banner.is_active)}
                  className={`text-xs font-semibold px-4 py-1.5 rounded-full transition ${
                    banner.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {banner.is_active ? 'Active' : 'Hidden'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#1a0a00] block mb-1">Label</label>
                  <input
                    type="text"
                    value={banner.label || ''}
                    onChange={(e) => updateBannerField(banner.id, 'label', e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#f59b1e]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a0a00] block mb-1">Heading</label>
                  <input
                    type="text"
                    value={banner.heading || ''}
                    onChange={(e) => updateBannerField(banner.id, 'heading', e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#f59b1e]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a0a00] block mb-1">Button Text</label>
                  <input
                    type="text"
                    value={banner.button_text || ''}
                    onChange={(e) => updateBannerField(banner.id, 'button_text', e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#f59b1e]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a0a00] block mb-1">Button Link</label>
                  <input
                    type="text"
                    value={banner.button_link || ''}
                    onChange={(e) => updateBannerField(banner.id, 'button_link', e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#f59b1e]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a0a00] block mb-1">Background Color</label>
                  <input
                    type="color"
                    value={banner.bg_color || '#1a0a00'}
                    onChange={(e) => updateBannerField(banner.id, 'bg_color', e.target.value)}
                    className="w-full h-9 border border-stone-200 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a0a00] block mb-1">Text Color</label>
                  <input
                    type="color"
                    value={banner.text_color || '#ffffff'}
                    onChange={(e) => updateBannerField(banner.id, 'text_color', e.target.value)}
                    className="w-full h-9 border border-stone-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={() => saveBanner(banner)}
                disabled={saving}
                className="bg-[#1a0a00] text-white px-6 py-2 rounded-full text-xs font-bold hover:bg-[#f59b1e] hover:text-[#1a0a00] transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Banner'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}