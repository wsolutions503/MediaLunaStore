import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { getProducts, getCategories, getSettings, getCustomerSession, clearCustomerSession } from '../store'
import { useToast } from '../hooks/useToast'
import { useCart, useScrollLock } from './hooks'
import ProductCard, { isNewProduct } from './ProductCard'
import ProductModal from './ProductModal'
import CartDrawer from './CartDrawer'
import AccountModal from './AccountModal'
import OrdersModal from './OrdersModal'
import './shop.css'

export default function TiendaPage() {
  const [products, setProducts] = useState(null)
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState({})
  const [error, setError] = useState(false)
  const [customer, setCustomer] = useState(getCustomerSession)
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('new')
  const [selected, setSelected] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [account, setAccount] = useState(null) // {reason}
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const { toasts, addToast } = useToast()
  const cart = useCart()

  const load = useCallback(async () => {
    setError(false)
    try {
      const [p, c, s] = await Promise.all([getProducts(), getCategories(), getSettings()])
      const visible = p.filter(x => x.active !== false && x.stock > 0)
      setProducts(visible); setCategories(c); setSettings(s)
      cart.reconcile(visible)
    } catch (e) { console.error(e); setError(true) }
  }, [cart.reconcile]) // eslint-disable-line

  useEffect(() => { load() }, [load])
  useEffect(() => { document.title = `${settings.storeName || 'Media Luna Store'} · Tienda` }, [settings.storeName])
  useScrollLock(!!selected || cartOpen || !!account || ordersOpen)

  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const qtyOf = (id) => cart.items.find(i => i.productId === id)?.qty || 0

  const lines = useMemo(() => (products ? cart.items.map(i => ({ product: products.find(p => p.id === i.productId), qty: i.qty })).filter(l => l.product) : []), [cart.items, products])
  const count = lines.reduce((s, l) => s + l.qty, 0)

  const list = useMemo(() => {
    if (!products) return []
    const term = q.trim().toLowerCase()
    let r = products.filter(p => (cat === 'all' || p.categoryId === cat || p.category === cat) &&
      (!term || `${p.name} ${p.description || ''}`.toLowerCase().includes(term)))
    const by = {
      new: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      low: (a, b) => a.salePrice - b.salePrice,
      high: (a, b) => b.salePrice - a.salePrice,
      name: (a, b) => a.name.localeCompare(b.name, 'es'),
    }[sort]
    return [...r].sort(by)
  }, [products, cat, q, sort])

  const add = (p) => { cart.setQty(p.id, qtyOf(p.id) + 1, p.stock); addToast(`${p.name} agregado al carrito`) }
  const inc = (p) => cart.setQty(p.id, qtyOf(p.id) + 1, p.stock)
  const dec = (p) => cart.setQty(p.id, qtyOf(p.id) - 1, p.stock)

  const logout = () => { clearCustomerSession(); setCustomer(null); setMenu(false); addToast('Sesión cerrada') }
  const min = Number(settings.freeShippingMin) || 0
  const firstName = customer?.name?.split(' ')[0]

  return (
    <MotionConfig reducedMotion="user">
      <div className="shop">
        {min > 0 && <div className="shop-promo">🚚 Envío gratis en compras desde ${min}</div>}
        <header className="shop-header">
          <button className="shop-brand" onClick={() => { setCat('all'); setQ(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <span>💎</span><b className="brand-text">{settings.storeName || 'Media Luna Store'}</b>
          </button>
          <div className="shop-search">
            <span aria-hidden="true">🔍</span>
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar joyas…" aria-label="Buscar productos" />
          </div>
          <div className="shop-actions">
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" aria-label={customer ? 'Mi cuenta' : 'Ingresar'}
                onClick={() => customer ? setMenu(m => !m) : setAccount({})}>
                <span aria-hidden="true">👤</span><span className="acct-label">{customer ? firstName : 'Ingresar'}</span>
              </button>
              {menu && customer && (
                <div className="shop-dialog" style={{ position: 'absolute', right: 0, top: 48, width: 210, padding: 8, zIndex: 60 }}>
                  <button className="btn-ghost" style={{ width: '100%', marginBottom: 6 }} onClick={() => { setOrdersOpen(true); setMenu(false) }}>Mis pedidos</button>
                  <button className="btn-ghost" style={{ width: '100%' }} onClick={logout}>Cerrar sesión</button>
                </div>
              )}
            </div>
            <button className="icon-btn" aria-label={`Carrito, ${count} artículos`} onClick={() => setCartOpen(true)}>
              <span aria-hidden="true">🛍️</span>
              {count > 0 && <span className="cart-badge">{count}</span>}
            </button>
          </div>
        </header>

        <main className="shop-main">
          <section className="shop-hero">
            <h1>Joyas que <em>brillan</em> contigo</h1>
            <p>Descubre nuestras piezas. Crea tu cuenta, arma tu carrito y confirma por WhatsApp.</p>
          </section>

          <div className="shop-toolbar">
            <div className="cat-pills" role="tablist" aria-label="Categorías">
              <button className={`cat-pill ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>Todo</button>
              {categories.map(c => <button key={c.id} className={`cat-pill ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.icon} {c.name}</button>)}
            </div>
            <select className="shop-sort" value={sort} onChange={e => setSort(e.target.value)} aria-label="Ordenar">
              <option value="new">Novedades</option><option value="low">Precio: menor a mayor</option>
              <option value="high">Precio: mayor a menor</option><option value="name">Nombre</option>
            </select>
          </div>

          {error ? (
            <div className="shop-empty"><p>No pudimos cargar el catálogo.</p><button className="btn-cta" style={{ margin: '12px auto' }} onClick={load}>Reintentar</button></div>
          ) : products === null ? (
            <div className="shop-grid">{Array.from({ length: 8 }, (_, i) => <div className="sk" key={i} />)}</div>
          ) : list.length === 0 ? (
            <div className="shop-empty"><p>No encontramos productos{q ? ` para “${q}”` : ''}.</p></div>
          ) : (
            <div className="shop-grid">
              {list.map((p, i) => <ProductCard key={p.id} product={p} category={catById.get(p.categoryId)} qty={qtyOf(p.id)} index={i}
                onOpen={setSelected} onAdd={add} onInc={inc} onDec={dec} />)}
            </div>
          )}
        </main>

        <footer className="shop-footer">© {new Date().getFullYear()} {settings.storeName || 'Media Luna Store'} · <a href="#/">Acceso personal</a></footer>

        <AnimatePresence>
          {selected && products && (() => { const p = products.find(x => x.id === selected.id); return p ? (
            <ProductModal key="pm" product={p} category={catById.get(p.categoryId)} qty={qtyOf(p.id)} onClose={() => setSelected(null)}
              onAdd={add} onInc={inc} onDec={dec} onOpenCart={() => { setSelected(null); setCartOpen(true) }} />) : null })()}
          {cartOpen && (
            <CartDrawer key="cd" lines={lines} settings={settings} customer={customer} onClose={() => setCartOpen(false)}
              onQty={cart.setQty} onClear={cart.clear} onNeedAuth={(reason) => setAccount({ reason })}
              onOrdered={load} onStockProblem={load} onCustomerUpdate={setCustomer} />)}
          {account && (
            <AccountModal key="am" reason={account.reason} onClose={() => setAccount(null)}
              onAuth={(c) => { setCustomer(c); setAccount(null); addToast(`Hola, ${c.name.split(' ')[0]} 👋`) }} />)}
          {ordersOpen && customer && <OrdersModal key="om" customer={customer} onClose={() => setOrdersOpen(false)} />}
        </AnimatePresence>

        <div className="toast-container">
          {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
        </div>
      </div>
    </MotionConfig>
  )
}
