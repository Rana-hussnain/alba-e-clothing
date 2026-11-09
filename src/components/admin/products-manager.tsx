'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatPKR, parseJsonArray } from '@/lib/shop'

interface AdminProduct {
  id: string
  slug: string
  name: string
  category: 'kids' | 'men'
  subtype: string
  description: string
  price: number
  image: string
  sizes: string
  colors: string
  featured: boolean
  stock: number | null
  createdAt: string
}

const KIDS_SUBTYPES = [
  'T-Shirts', 'Trousers', 'Cotton Pants', 'Jeans', 'Cargo Trousers',
  'Casual Shirts', 'Sweatshirts', 'Hoodies', 'Baggy Trousers',
]
const MEN_SUBTYPES = [
  'T-Shirts', 'Trousers', 'Cotton Pants', 'Jeans', 'Cargo Trousers',
  'Casual Shirts', 'Sweatshirts', 'Hoodies', 'Leather Belts', 'Baggy Trousers',
]

const KIDS_SIZES = ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y']
const MEN_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

interface ProductForm {
  name: string
  category: 'kids' | 'men'
  subtype: string
  price: string
  description: string
  sizes: string
  colors: string
  image: string
  featured: boolean
  stock: string // empty = not tracked
}

function emptyForm(): ProductForm {
  return {
    name: '',
    category: 'kids',
    subtype: 'T-Shirts',
    price: '',
    description: '',
    sizes: '',
    colors: '',
    image: '',
    featured: false,
    stock: '',
  }
}

export function ProductsManager({ onSessionExpired }: { onSessionExpired?: () => void }) {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<AdminProduct | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await fetch('/api/admin/products', { cache: 'no-store' })
        if (res.status === 401) {
          toast.error('Session expired — please sign in again')
          onSessionExpired?.()
          return
        }
        if (!res.ok) throw new Error()
        const data = await res.json()
        setProducts(data.products ?? [])
      } catch {
        toast.error('Could not load products')
      } finally {
        setLoading(false)
      }
    },
    [onSessionExpired]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on mount
    load()
  }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (p: AdminProduct) => {
    setEditing(p)
    setForm({
      name: p.name,
      category: p.category,
      subtype: p.subtype,
      price: String(p.price),
      description: p.description,
      sizes: parseJsonArray(p.sizes).join(', '),
      colors: parseJsonArray(p.colors).join(', '),
      image: p.image,
      featured: p.featured,
      stock: p.stock === null ? '' : String(p.stock),
    })
    setDialogOpen(true)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setForm((f) => ({ ...f, image: data.path }))
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Product name is required')
      return
    }
    if (!form.price || Number(form.price) < 1) {
      toast.error('Enter a valid price in PKR')
      return
    }
    if (!form.image.trim()) {
      toast.error('Add a product image (upload or URL)')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        category: form.category,
        subtype: form.subtype,
        price: Number(form.price),
        description: form.description,
        sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
        colors: form.colors.split(',').map((s) => s.trim()).filter(Boolean),
        image: form.image,
        featured: form.featured,
        stock: form.stock.trim() === '' ? null : Number(form.stock),
      }
      const res = await fetch('/api/admin/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save product')

      toast.success(editing ? 'Product updated' : 'Product added — live on the storefront now')
      setDialogOpen(false)
      await load(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(deleting.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      toast.success(`Deleted "${deleting.name}"`)
      setDeleting(null)
      await load(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setDeleteBusy(false)
    }
  }

  const subtypes = form.category === 'kids' ? KIDS_SUBTYPES : MEN_SUBTYPES

  return (
    <section aria-label="Product management">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-[0.14em]">Products</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {loading ? 'Loading…' : `${products.length} products — edits go live on the storefront instantly`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            className="h-9 px-3 border border-border text-[10px] font-semibold tracking-[0.16em] uppercase hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
            aria-label="Refresh products"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openAdd}
            className="h-9 px-4 bg-primary text-primary-foreground text-[10px] font-semibold tracking-[0.16em] uppercase hover:bg-primary/85 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border p-4 flex gap-4 animate-pulse bg-card">
              <div className="h-16 w-12 bg-secondary shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 bg-secondary" />
                <div className="h-3 w-24 bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="border border-dashed border-border p-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] mb-1.5">No products</p>
          <p className="text-xs text-muted-foreground">Add your first product to fill the storefront.</p>
        </div>
      ) : (
        <div className="border border-border bg-card divide-y divide-border max-h-[70vh] overflow-y-auto">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors">
              <div className="relative h-16 w-12 shrink-0 bg-secondary overflow-hidden">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized={p.image.startsWith('https://')}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate flex items-center gap-2">
                  {p.name}
                  {p.featured && (
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" aria-label="Featured" />
                  )}
                </p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-1">
                  {p.category} · {p.subtype} · {parseJsonArray(p.sizes).length} sizes ·{' '}
                  <span className={p.stock === 0 ? 'text-destructive font-bold' : ''}>
                    {p.stock === null ? 'stock not tracked' : p.stock === 0 ? 'SOLD OUT' : `${p.stock} in stock`}
                  </span>
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums shrink-0 hidden sm:block">{formatPKR(p.price)}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openEdit(p)}
                  className="h-8 w-8 border border-border inline-flex items-center justify-center hover:bg-secondary transition-colors"
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleting(p)}
                  className="h-8 w-8 border border-red-200 text-red-700 inline-flex items-center justify-center hover:bg-red-50 transition-colors"
                  aria-label={`Delete ${p.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Edit product' : 'Add product'}
        >
          <div className="w-full max-w-2xl bg-card border border-border shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em]">
                {editing ? `Edit — ${editing.name}` : 'Add New Product'}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 grid sm:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[10px] font-semibold tracking-[0.16em] uppercase">Product Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Kids Graphic Tee — White"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold tracking-[0.16em] uppercase">Category *</Label>
                <div className="flex">
                  {(['kids', 'men'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          category: c,
                          subtype: 'T-Shirts',
                        }))
                      }
                      className={`flex-1 h-10 text-[10px] font-semibold tracking-[0.16em] uppercase border transition-colors ${
                        form.category === c
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-secondary'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold tracking-[0.16em] uppercase">Subtype *</Label>
                <select
                  value={form.subtype}
                  onChange={(e) => setForm((f) => ({ ...f, subtype: e.target.value }))}
                  className="h-10 w-full border border-border bg-background px-2 text-sm outline-none focus:border-foreground"
                  aria-label="Product subtype"
                >
                  {subtypes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold tracking-[0.16em] uppercase">Price (PKR) *</Label>
                <Input
                  value={form.price}
                  inputMode="numeric"
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="1999"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-stock" className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Stock (pieces)
                </Label>
                <Input
                  id="p-stock"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="Empty = not tracked"
                  className="h-10"
                />
                <p className="text-[10px] text-muted-foreground">0 shows “Sold out”. Orders subtract automatically.</p>
              </div>

              <div className="space-y-1.5 flex items-end">
                <label className="flex items-center gap-2 h-10 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    className="h-4 w-4 accent-foreground"
                  />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] inline-flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" /> Featured on homepage
                  </span>
                </label>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[10px] font-semibold tracking-[0.16em] uppercase">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description shown on the product page…"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold tracking-[0.16em] uppercase">Sizes (comma separated)</Label>
                <Input
                  value={form.sizes}
                  onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
                  placeholder={form.category === 'kids' ? KIDS_SIZES.join(', ') : MEN_SIZES.join(', ')}
                  className="h-10"
                />
                <p className="text-[10px] text-muted-foreground">Leave empty for defaults</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold tracking-[0.16em] uppercase">Colors (comma separated)</Label>
                <Input
                  value={form.colors}
                  onChange={(e) => setForm((f) => ({ ...f, colors: e.target.value }))}
                  placeholder="Black, White, Navy"
                  className="h-10"
                />
                <p className="text-[10px] text-muted-foreground">Leave empty for defaults</p>
              </div>

              {/* Image */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-[10px] font-semibold tracking-[0.16em] uppercase">Product Image *</Label>
                <div className="flex items-start gap-4">
                  <div className="relative h-28 w-24 shrink-0 border border-border bg-secondary/40 overflow-hidden">
                    {form.image ? (
                      <Image
                        src={form.image}
                        alt="Product preview"
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized={form.image.startsWith('https://')}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-6 w-6" strokeWidth={1.25} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadImage(file)
                        e.target.value = ''
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="h-9 px-4 border border-border text-[10px] font-semibold tracking-[0.16em] uppercase hover:bg-secondary transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                      {uploading ? 'Uploading…' : 'Upload Image'}
                    </button>
                    <Input
                      value={form.image.startsWith('/uploads/') ? '' : form.image}
                      onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                      placeholder="…or paste an https:// image URL"
                      className="h-9 text-xs"
                      disabled={uploading}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setDialogOpen(false)}
                className="h-10 px-5 border border-border text-[10px] font-semibold tracking-[0.16em] uppercase hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || uploading}
                className="h-10 px-6 bg-primary text-primary-foreground text-[10px] font-semibold tracking-[0.16em] uppercase hover:bg-primary/85 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm delete"
        >
          <div className="w-full max-w-sm bg-card border border-border shadow-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] mb-2">Delete product?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-1">
              <span className="font-semibold text-foreground">{deleting.name}</span> will be
              removed from the storefront immediately.
            </p>
            <p className="text-[11px] text-muted-foreground mb-6">
              Past orders that included it keep their records — nothing else is affected.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="h-10 px-5 border border-border text-[10px] font-semibold tracking-[0.16em] uppercase hover:bg-secondary transition-colors"
              >
                Keep
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteBusy}
                className="h-10 px-6 bg-red-600 text-white text-[10px] font-semibold tracking-[0.16em] uppercase hover:bg-red-700 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
              >
                {deleteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
