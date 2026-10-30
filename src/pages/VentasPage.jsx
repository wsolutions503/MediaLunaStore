import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getSales, getProducts, getCustomers, getCategories,
  createSale, updateSale, addCustomer,
  fmt, fmtDate, CHANNELS, CHANNEL_ICONS, SALE_STATUS, PAY_STATUS
} from '../store'

const EMPTY_SALE = { customerId: '', channel: 'WhatsApp', notes: '', items: [] }
const EMPTY_CUSTOMER = { name: '', email: '', phone: '', address: '' }

export default function VentasPage({ user, toast }) {
  const [refresh, setRefresh]   = useState(0)
  const [tab, setTab]           = useState('list') // list | new
  const [sale, setSale]         = useState(EMPTY_SALE)
  const [customerTab, setCustomerTab] = useState('search') // search | new
  const [custSearch, setCustSearch]   = useState('')
  const [newCust, setNewCust]   = useState(EMPTY_CUSTOMER)
  const [step, setStep]         = useState(1) // 1=products 2=customer 3=confirm
  const [saving, setSaving]     = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterChannel, setFilterChannel] = useState('')
  const [detailSale, setDetailSale] = useState(null)
  const [activeCat, setActiveCat]   = useState('all')
  const [prodSearch, setProdSearch] = useState('')

  const [sales, setSales]         = useState([])
  const [products, setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [customers, setCustomers] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const canEditStatus = user.role === 'admin' || user.role === 'superadmin'

  const loadData = async () => {
    const [s, p, c, cu] = await Promise.all([getSales(), getProducts(), getCategories(), getCustomers()])
    setSales(s); setProducts(p.filter(x => x.active && x.stock > 0)); setCategories(c); setCustomers(cu); setLoadingData(false)
  }

  useEffect(() => { loadData() }, [refresh])

  const filtered = sales.filter(s => {
    const matchStatus  = !filterStatus  || s.status === filterStatus
    const matchChannel = !filterChannel || s.channel === filterChannel
    return matchStatus && matchChannel
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // ── Item management ──────────────────────────────────────────────────────
  function addItem(product) {
    setSale(s => {
      const existing = s.items.find(i => i.productId === product.id)
      if (existing) {
        return { ...s, items: s.items.map(i => i.productId === product.id && i.qty < product.stock ? { ...i, qty: i.qty + 1 } : i) }
      }
      return { ...s, items: [...s.items, { productId: product.id, name: product.name, qty: 1, salePrice: product.salePrice, costPrice: product.costPrice }] }
    })
  }
  function removeItem(productId) { setSale(s => ({ ...s, items: s.items.filter(i => i.productId !== productId) })) }
  function updateQty(productId, qty) {
    const p = products.find(pr => pr.id === productId)
    const q = Math.max(1, Math.min(parseInt(qty) || 1, p?.stock || 99))
    setSale(s => ({ ...s, items: s.items.map(i => i.productId === productId ? { ...i, qty: q } : i) }))
  }

  const saleTotal = sale.items.reduce((a, i) => a + i.salePrice * i.qty, 0)

  // ── Customer selection ───────────────────────────────────────────────────
  function selectCustomer(c) {
    setSale(s => ({ ...s, customerId: c.id, customerName: c.name, customerPhone: c.phone || '', customerEmail: c.email || '', customerAddress: c.address || '' }))
  }

  async function createNewCustomer() {
    if (!newCust.name) return
    const c = await addCustomer(newCust)
    selectCustomer(c)
    try { setCustomers(await getCustomers()) } catch { /* se recarga luego */ }
    setNewCust(EMPTY_CUSTOMER)
    setCustomerTab('search')
    toast('✓ Cliente creado')
  }

  // ── Submit sale ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!sale.customerId || sale.items.length === 0) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    await createSale({ ...sale, total: saleTotal, sellerId: user.id, sellerName: user.name })
    setSaving(false); setTab('list'); setSale(EMPTY_SALE); setStep(1)
    setRefresh(r => r + 1); toast('✓ Venta registrada')
  }

  // ── Status update ────────────────────────────────────────────────────────
  async function cycleStatus(id, current) {
    const order = ['pendiente', 'enviado', 'entregado']
    const next = order[(order.indexOf(current) + 1) % order.length]
    await updateSale(id, { status: next }); setRefresh(r => r + 1)
  }
  async function cyclePay(id, current) {
    const order = ['pendiente', 'pagado']
    const next = order[(order.indexOf(current) + 1) % order.length]
    await updateSale(id, { paymentStatus: next }); setRefresh(r => r + 1)
  }

  const filteredCusts = customers.filter(c => {
    const q = custSearch.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
  })

  if (loadingData) return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)' }}>⏳ Cargando ventas...</div>

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.15rem' }}>Ventas</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: 2 }}>{sales.length} ventas registradas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${tab === 'list' ? 'btn-ghost' : 'btn-primary'}`} onClick={() => { setTab('new'); setSale(EMPTY_SALE); setStep(1) }}>✦ Nueva venta</button>
          {tab === 'new' && <button className="btn btn-ghost" onClick={() => setTab('list')}>← Volver</button>}
        </div>
      </div>

      {/* ── NEW SALE WIZARD ── */}
      {tab === 'new' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[['1', 'Productos'], ['2', 'Cliente'], ['3', 'Confirmar']].map(([n, label]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: parseInt(n) <= step ? 'var(--gold)' : 'rgba(255,255,255,0.08)', color: parseInt(n) <= step ? '#1a0f00' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{n}</div>
                <span style={{ fontSize: '0.78rem', color: parseInt(n) === step ? 'var(--gold)' : 'var(--text3)' }}>{label}</span>
                {n !== '3' && <span style={{ color: 'var(--border2)', margin: '0 4px' }}>›</span>}
              </div>
            ))}
          </div>

          {/* STEP 1 — Products */}
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
              {/* Left: category pills + product grid */}
              <div className="glass" style={{ padding: 18 }}>
                {/* Search bar */}
                <input
                  className="input"
                  placeholder="🔍 Buscar producto..."
                  value={prodSearch}
                  onChange={e => { setProdSearch(e.target.value); setActiveCat('all') }}
                  style={{ marginBottom: 14 }}
                />
                {/* Category pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  <button
                    onClick={() => { setActiveCat('all'); setProdSearch('') }}
                    style={{
                      padding: '5px 14px', borderRadius: 99, fontSize: '0.75rem', fontFamily: 'var(--font-head)', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                      background: activeCat === 'all' ? 'linear-gradient(135deg, var(--gold), var(--gold2))' : 'rgba(255,255,255,0.06)',
                      color: activeCat === 'all' ? '#1a0f00' : 'var(--text3)',
                    }}
                  >
                    Todos
                  </button>
                  {categories.filter(c => products.some(p => p.categoryId === c.id)).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCat(cat.id); setProdSearch('') }}
                      style={{
                        padding: '5px 14px', borderRadius: 99, fontSize: '0.75rem', fontFamily: 'var(--font-head)', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                        background: activeCat === cat.id ? 'linear-gradient(135deg, var(--gold), var(--gold2))' : 'rgba(255,255,255,0.06)',
                        color: activeCat === cat.id ? '#1a0f00' : 'var(--text3)',
                      }}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>

                {/* Product cards grid */}
                {(() => {
                  const visible = products.filter(p => {
                    const matchCat = activeCat === 'all' || p.categoryId === activeCat
                    const matchQ   = !prodSearch || p.name.toLowerCase().includes(prodSearch.toLowerCase())
                    return matchCat && matchQ
                  })
                  if (!visible.length) return (
                    <div className="empty-state"><div className="empty-icon">🔍</div><p>Sin productos en esta categoría</p></div>
                  )
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 10 }}>
                      {visible.map(p => {
                        const inCart = sale.items.find(i => i.productId === p.id)
                        const cat    = categories.find(c => c.id === p.categoryId)
                        return (
                          <motion.div
                            key={p.id}
                            layout
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${inCart ? 'rgba(240,192,96,0.5)' : 'var(--border)'}`,
                              background: inCart ? 'rgba(240,192,96,0.07)' : 'rgba(255,255,255,0.03)',
                              overflow: 'hidden',
                              transition: 'border-color 0.2s, background 0.2s',
                              position: 'relative',
                            }}
                          >
                            {/* Product photo / icon strip */}
                            <div style={{ height: 80, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                              {p.photo
                                ? <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ fontSize: '2rem', opacity: 0.5 }}>{cat?.icon || '💎'}</span>
                              }
                              {inCart && (
                                <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--gold)', color: '#1a0f00', borderRadius: 99, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                                  {inCart.qty}
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div style={{ padding: '10px 10px 8px' }}>
                              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2, lineHeight: 1.3 }}>
                                {p.name.length > 28 ? p.name.slice(0, 28) + '…' : p.name}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ color: 'var(--gold)', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>{fmt(p.salePrice)}</span>
                                <span style={{ fontSize: '0.68rem', color: p.stock <= 3 ? 'var(--red)' : 'var(--text3)' }}>
                                  {p.stock <= 3 ? '⚠️' : ''} {p.stock} uds.
                                </span>
                              </div>

                              {/* Add / qty controls */}
                              {!inCart ? (
                                <button
                                  onClick={() => addItem(p)}
                                  style={{ width: '100%', padding: '6px', borderRadius: 6, background: 'rgba(240,192,96,0.12)', border: '1px solid rgba(240,192,96,0.3)', color: 'var(--gold)', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'background 0.15s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,192,96,0.22)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(240,192,96,0.12)'}
                                >
                                  + Agregar
                                </button>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(240,192,96,0.1)', border: '1px solid rgba(240,192,96,0.3)', borderRadius: 6, overflow: 'hidden' }}>
                                  <button
                                    onClick={() => inCart.qty === 1 ? removeItem(p.id) : updateQty(p.id, inCart.qty - 1)}
                                    style={{ width: 32, height: 30, background: 'none', border: 'none', color: inCart.qty === 1 ? 'var(--red)' : 'var(--gold)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    {inCart.qty === 1 ? '✕' : '−'}
                                  </button>
                                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold)', minWidth: 20, textAlign: 'center' }}>
                                    {inCart.qty}
                                  </span>
                                  <button
                                    onClick={() => updateQty(p.id, inCart.qty + 1)}
                                    disabled={inCart.qty >= p.stock}
                                    style={{ width: 32, height: 30, background: 'none', border: 'none', color: inCart.qty >= p.stock ? 'var(--text3)' : 'var(--gold)', fontWeight: 700, fontSize: '1rem', cursor: inCart.qty >= p.stock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              {/* Right: Cart summary */}
              <div style={{ alignSelf: 'start' }}>
                <div className="glass" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.88rem' }}>🛒 Carrito</p>
                    {sale.items.length > 0 && (
                      <span style={{ background: 'var(--gold)', color: '#1a0f00', borderRadius: 99, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                        {sale.items.reduce((a, i) => a + i.qty, 0)}
                      </span>
                    )}
                  </div>

                  {sale.items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 0' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: 8, opacity: 0.3 }}>🛒</div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>Agrega productos<br/>desde el catálogo</p>
                    </div>
                  ) : (
                    <>
                      <AnimatePresence>
                        {sale.items.map(item => (
                          <motion.div
                            key={item.productId}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '0.76rem', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>
                                  {fmt(item.salePrice)} × {item.qty} = <span style={{ color: 'var(--gold)' }}>{fmt(item.salePrice * item.qty)}</span>
                                </p>
                              </div>
                              <button onClick={() => removeItem(item.productId)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 4px', flexShrink: 0 }} title="Quitar">✕</button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      <div style={{ marginTop: 12, padding: '10px 0 0', borderTop: '1px solid rgba(240,192,96,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{sale.items.reduce((a, i) => a + i.qty, 0)} artículos</span>
                          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--gold)' }}>{fmt(saleTotal)}</span>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={async () => { const cu = await getCustomers(); setCustomers(cu); setStep(2) }}>
                          Siguiente → Cliente
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Customer */}
          {step === 2 && (
            <div style={{ maxWidth: 560 }}>
              <div className="glass" style={{ padding: 20 }}>
                <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.88rem', marginBottom: 14 }}>👤 Cliente</p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {['search', 'new'].map(t => (
                    <button key={t} className={`btn btn-sm ${customerTab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setCustomerTab(t); if(t==='search') getCustomers().then(cu => setCustomers(cu)) }}>
                      {t === 'search' ? '🔍 Buscar existente' : '✦ Crear nuevo'}
                    </button>
                  ))}
                </div>

                {customerTab === 'search' ? (
                  <>
                    <input className="input" placeholder="Buscar por nombre, teléfono..." value={custSearch} onChange={e => setCustSearch(e.target.value)} style={{ marginBottom: 10 }} />
                    <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {filteredCusts.length === 0 ? (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text3)', textAlign: 'center', padding: 16 }}>Sin resultados. Crea un cliente nuevo.</p>
                      ) : filteredCusts.map(c => (
                        <div key={c.id} onClick={() => selectCustomer(c)} style={{ padding: '10px 14px', background: sale.customerId === c.id ? 'rgba(240,192,96,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sale.customerId === c.id ? 'rgba(240,192,96,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <p style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text)' }}>{c.name}</p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{c.phone} {c.email && `· ${c.email}`}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="label">Nombre *</label>
                      <input className="input" value={newCust.name} onChange={e => setNewCust(c => ({ ...c, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Teléfono</label>
                      <input className="input" value={newCust.phone} onChange={e => setNewCust(c => ({ ...c, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Correo</label>
                      <input className="input" type="email" value={newCust.email} onChange={e => setNewCust(c => ({ ...c, email: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="label">Dirección de envío</label>
                      <input className="input" value={newCust.address} onChange={e => setNewCust(c => ({ ...c, address: e.target.value }))} />
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ gridColumn: '1/-1' }} onClick={createNewCustomer} disabled={!newCust.name}>
                      ✦ Crear cliente
                    </button>
                  </div>
                )}

                {sale.customerId && (
                  <div className="alert alert-success" style={{ marginTop: 12 }}>
                    ✓ Cliente seleccionado: <strong>{sale.customerName}</strong>
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <label className="label">Canal de venta</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CHANNELS.filter(ch => ch !== 'Tienda online').map(ch => (
                      <button key={ch} className={`btn btn-sm ${sale.channel === ch ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSale(s => ({ ...s, channel: ch }))}>
                        {CHANNEL_ICONS[ch]} {ch}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label className="label">Notas</label>
                  <textarea className="input" rows={2} placeholder="Instrucciones especiales, color, talla..." value={sale.notes} onChange={e => setSale(s => ({ ...s, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>← Volver</button>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(3)} disabled={!sale.customerId}>
                    Siguiente → Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Confirm */}
          {step === 3 && (
            <div style={{ maxWidth: 480 }}>
              <div className="glass grad-border" style={{ padding: 24 }}>
                <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', marginBottom: 18, color: 'var(--gold)' }}>✦ Resumen de venta</p>

                <div style={{ marginBottom: 14 }}>
                  {sale.items.map(i => (
                    <div key={i.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                      <span style={{ color: 'var(--text2)' }}>{i.name} × {i.qty}</span>
                      <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{fmt(i.salePrice * i.qty)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.05rem' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--gold)' }}>{fmt(saleTotal)}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text3)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
                  <span>👤 {sale.customerName}</span>
                  <span>{CHANNEL_ICONS[sale.channel]} {sale.channel}</span>
                  {sale.notes && <span>📝 {sale.notes}</span>}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>← Volver</button>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSubmit} disabled={saving}>
                    {saving ? '⌛ Guardando...' : '✓ Confirmar venta'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── SALES LIST ── */}
      {tab === 'list' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <select className="input" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(SALE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="input" style={{ width: 'auto' }} value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
              <option value="">Todos los canales</option>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="glass" style={{ overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Canal</th>
                    <th>Total</th>
                    <th>Pago</th>
                    <th>Envío</th>
                    {canEditStatus && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🛍️</div><p>Sin ventas aún. Registra la primera.</p></div></td></tr>
                  ) : filtered.map(s => (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setDetailSale(s)}>
                      <td style={{ fontSize: '0.78rem' }}>{fmtDate(s.createdAt)}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text)' }}>{s.customerName}</td>
                      <td><span className="badge badge-gray">{CHANNEL_ICONS[s.channel]} {s.channel}</span></td>
                      <td style={{ color: 'var(--gold)', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(s.total)}</td>
                      <td onClick={e => { e.stopPropagation(); if(canEditStatus) cyclePay(s.id, s.paymentStatus) }}>
                        <span className={`badge ${PAY_STATUS[s.paymentStatus]?.badge || 'badge-gray'}`} style={{ cursor: canEditStatus ? 'pointer' : 'default' }}>
                          {PAY_STATUS[s.paymentStatus]?.label}
                        </span>
                      </td>
                      <td onClick={e => { e.stopPropagation(); if(canEditStatus) cycleStatus(s.id, s.status) }}>
                        <span className={`badge ${SALE_STATUS[s.status]?.badge || 'badge-gray'}`} style={{ cursor: canEditStatus ? 'pointer' : 'default' }}>
                          {SALE_STATUS[s.status]?.label}
                        </span>
                      </td>
                      {canEditStatus && <td style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{s.sellerName}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Sale detail modal */}
      <AnimatePresence>
        {detailSale && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && setDetailSale(null)}>
            <motion.div className="modal" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}>
              <div className="modal-title">
                <span>🛍️ Detalle de venta</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setDetailSale(null)}>✕</button>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text3)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>📅 {fmtDate(detailSale.createdAt)}</span>
                <span>👤 {detailSale.customerName}</span>
                <span>{CHANNEL_ICONS[detailSale.channel]} Canal: {detailSale.channel}</span>
                <span>🏷️ Vendedor: {detailSale.sellerName}</span>
                {detailSale.notes && <span>📝 {detailSale.notes}</span>}
              </div>
              <hr className="divider" />
              {detailSale.items?.map(i => (
                <div key={i.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                  <span style={{ color: 'var(--text2)' }}>{i.name} × {i.qty}</span>
                  <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{fmt(i.salePrice * i.qty)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.05rem' }}>
                <span>Total</span>
                <span style={{ color: 'var(--gold)' }}>{fmt(detailSale.total)}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
