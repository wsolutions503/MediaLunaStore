import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import { getProducts, getCategories, addProduct, updateProduct, getLowStockProducts, fmt, fmtDate } from '../store'

const EMPTY = { name: '', categoryId: '', description: '', costPrice: '', salePrice: '', stock: '', minStock: 3, photo: null }

export default function InventarioPage({ user, toast }) {
  const [products, setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [lowStockIds, setLowStockIds] = useState(new Set())
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileRef = useRef()

  const canEdit = user.role === 'admin' || user.role === 'superadmin'

  const loadData = async () => {
    const [p, c, ls] = await Promise.all([getProducts(), getCategories(), getLowStockProducts()])
    setProducts(p); setCategories(c); setLowStockIds(new Set(ls.map(x => x.id))); setLoading(false)
  }
  useEffect(() => { loadData() }, [])

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    return p.active && (!q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) && (!catFilter || p.categoryId === catFilter)
  })

  function openNew() { setForm(EMPTY); setEditProduct(null); setModalOpen(true) }
  function openEdit(p) { setForm({ name: p.name, categoryId: p.categoryId, description: p.description || '', costPrice: p.costPrice, salePrice: p.salePrice, stock: p.stock, minStock: p.minStock, photo: p.photo }); setEditProduct(p); setModalOpen(true) }

  async function handleSave() {
    if (!form.name || !form.salePrice || form.stock === '') return
    setSaving(true)
    const data = { ...form, costPrice: parseFloat(form.costPrice) || 0, salePrice: parseFloat(form.salePrice), stock: parseInt(form.stock), minStock: parseInt(form.minStock) || 3, createdBy: user.id }
    if (editProduct) { await updateProduct(editProduct.id, data) }
    else { await addProduct(data) }
    setSaving(false); setModalOpen(false); toast('✓ Producto guardado'); loadData()
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setForm(f => ({ ...f, photo: ev.target.result }))
    reader.readAsDataURL(file)
  }

  async function handleDelete(id) {
    await updateProduct(id, { active: false })
    setDeleteConfirm(null); toast('Producto eliminado'); loadData()
  }

  function exportExcel() {
    const rows = filtered.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)
      return { 'Nombre': p.name, 'Categoría': cat?.name || '—', 'Descripción': p.description || '', 'Precio compra ($)': p.costPrice, 'Precio venta ($)': p.salePrice, 'Margen ($)': (p.salePrice - p.costPrice).toFixed(2), 'Margen (%)': p.costPrice > 0 ? (((p.salePrice - p.costPrice) / p.costPrice) * 100).toFixed(1) + '%' : '—', 'Stock': p.stock, 'Stock mínimo': p.minStock, 'Estado stock': p.stock <= p.minStock ? '⚠️ Bajo' : 'OK', 'Creado': fmtDate(p.createdAt) }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, `inventario_medialuna_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const margin = p => p.costPrice > 0 ? (((p.salePrice - p.costPrice) / p.costPrice) * 100).toFixed(0) + '%' : '—'

  if (loading) return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)' }}>⏳ Cargando inventario...</div>

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.15rem' }}>Inventario</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: '2px' }}>{filtered.length} productos {lowStockIds.size > 0 && <span style={{ color: 'var(--red)' }}>· ⚠️ {lowStockIds.size} con stock bajo</span>}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={exportExcel}>📊 Exportar Excel</button>
          {canEdit && <button className="btn btn-primary btn-sm" onClick={openNew}>✦ Nuevo producto</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '16px' }}>
        <input className="input" placeholder="🔍 Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}/>
        <select className="input" style={{ width: 'auto' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Producto</th><th>Categoría</th><th>Costo</th><th>Venta</th><th>Margen</th><th>Stock</th>{canEdit && <th>Acciones</th>}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">💎</div><p>No hay productos.{canEdit && ' Agrega el primero.'}</p></div></td></tr>
              ) : filtered.map(p => {
                const cat = categories.find(c => c.id === p.categoryId)
                const isLow = lowStockIds.has(p.id)
                return (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="product-img">{p.photo ? <img src={p.photo} alt={p.name}/> : <span>{cat?.icon || '💎'}</span>}</div>
                        <div>
                          <p style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.86rem' }}>{p.name}</p>
                          {p.description && <p style={{ fontSize: '0.72rem', color: 'var(--text3)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td>{cat ? <span className="badge badge-gray">{cat.icon} {cat.name}</span> : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{fmt(p.costPrice)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--gold)' }}>{fmt(p.salePrice)}</td>
                    <td><span className="badge badge-green">{margin(p)}</span></td>
                    <td><span className={`badge ${isLow ? 'badge-red' : 'badge-cyan'}`}>{isLow ? '⚠️' : '✓'} {p.stock} {isLow ? '(bajo)' : 'uds.'}</span></td>
                    {canEdit && <td><div style={{ display: 'flex', gap: '6px' }}><button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button><button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(p.id)}>🗑️</button></div></td>}
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
            <motion.div className="modal" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}>
              <div className="modal-title"><span>{editProduct ? '✏️ Editar producto' : '✦ Nuevo producto'}</span><button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>✕</button></div>
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 12, background: 'var(--bg3)', border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }} onClick={() => fileRef.current.click()}>
                  {form.photo ? <img src={form.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <span style={{ fontSize: '1.6rem' }}>📷</span>}
                </div>
                <div>
                  <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>Subir foto</button>
                  {form.photo && <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => setForm(f => ({ ...f, photo: null }))}>Quitar</button>}
                  <p style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 4 }}>JPG, PNG — máx. 2MB</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}><label className="label">Nombre *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/></div>
                <div><label className="label">Categoría</label><select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}><option value="">Sin categoría</option>{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
                <div><label className="label">Stock actual *</label><input className="input" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}/></div>
                <div><label className="label">Precio de compra ($)</label><input className="input" type="number" step="0.01" min="0" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}/></div>
                <div><label className="label">Precio de venta ($) *</label><input className="input" type="number" step="0.01" min="0" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))}/></div>
                <div><label className="label">Stock mínimo (alerta)</label><input className="input" type="number" min="1" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))}/></div>
                {form.costPrice > 0 && form.salePrice > 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: '10px 14px', background: 'rgba(52,211,153,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(52,211,153,0.2)', fontSize: '0.8rem', color: 'var(--emerald)' }}>
                    📈 Margen: {fmt(form.salePrice - form.costPrice)} ({(((form.salePrice - form.costPrice) / form.costPrice) * 100).toFixed(1)}% ROI)
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1' }}><label className="label">Descripción</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }}/></div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.salePrice || form.stock === ''}>{saving ? '⌛ Guardando...' : '✓ Guardar'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" style={{ maxWidth: 360 }} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}>
              <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗑️</div>
                <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, marginBottom: '8px' }}>¿Eliminar producto?</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>Esta acción no se puede deshacer.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
