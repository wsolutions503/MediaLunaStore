import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { fmt, placeOrder, OrderError, updateCustomerProfile, waLink } from '../store'
import { useEscape } from './hooks'
import { Stepper } from './ProductCard'

export default function CartDrawer({ lines, settings, customer, onClose, onQty, onClear, onNeedAuth, onOrdered, onStockProblem, onCustomerUpdate }) {
  useEscape(true, onClose)
  const [view, setView] = useState('cart') // cart | checkout | done
  const [form, setForm] = useState({
    name: customer?.name || '', phone: customer?.phone || '',
    address: customer?.address || '', notes: '',
  })
  useEffect(() => {
    if (!customer) return
    setForm(f => ({ ...f, name: f.name || customer.name || '', phone: f.phone || customer.phone || '', address: f.address || customer.address || '' }))
  }, [customer])
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.product.salePrice * l.qty, 0), [lines])
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const min = Number(settings?.freeShippingMin) || 0
  const remaining = Math.max(0, min - subtotal)
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const goCheckout = () => {
    if (!customer) { onNeedAuth('Ingresa o crea tu cuenta para finalizar tu pedido.'); return }
    setView('checkout')
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Escribe tu nombre'
    if (form.phone.replace(/\D/g, '').length < 8) e.phone = 'Escribe un teléfono válido'
    if (form.address.trim().length < 8) e.address = 'Escribe tu dirección de envío'
    setErrors(e); setFormError('')
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const order = await placeOrder({
        customerId: customer.id, customerName: form.name.trim(), customerEmail: customer.email,
        customerPhone: form.phone.trim(), customerAddress: form.address.trim(),
        channel: 'Tienda online', source: 'online', sellerId: 'online', sellerName: 'Tienda online',
        notes: form.notes.trim(),
        items: lines.map(l => ({ productId: l.product.id, qty: l.qty })),
      })
      const id = order?.id || ''
      const code = id.slice(-6).toUpperCase()
      const total = order?.total ?? subtotal
      setDone({ code, total, lines: lines.map(l => ({ name: l.product.name, qty: l.qty, price: l.product.salePrice })), form: { ...form } })
      onClear()
      setView('done')
      onOrdered?.()
      updateCustomerProfile(customer.id, { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() })
        .then(() => onCustomerUpdate?.({ ...customer, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() }))
        .catch(() => {})
    } catch (err) {
      console.error(err)
      if (err instanceof OrderError) { setFormError(err.message); onStockProblem?.() }
      else setFormError('No pudimos enviar tu pedido. Revisa tu internet e intenta de nuevo.')
    }
    setBusy(false)
  }

  const waText = done && [
    `Hola, acabo de hacer el pedido #${done.code} en ${settings?.storeName || 'la tienda'}:`,
    ...done.lines.map(l => `• ${l.qty} x ${l.name} — ${fmt(l.price * l.qty)}`),
    `Total: ${fmt(done.total)}`,
    `Nombre: ${done.form.name}`,
    `Envío a: ${done.form.address}`,
  ].join('\n')
  const waHref = done && settings?.whatsapp ? waLink(settings.whatsapp, waText) : null

  return (
    <motion.div className="shop-overlay drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Carrito"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 38 }}>
        <header className="drawer-head">
          <h2>{view === 'done' ? '¡Pedido recibido!' : view === 'checkout' ? 'Finalizar pedido' : `Tu carrito${count ? ` (${count})` : ''}`}</h2>
          <button type="button" className="dialog-close static" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        {view === 'cart' && (
          <>
            {min > 0 && lines.length > 0 && (
              <div className="ship-bar">
                <p>{remaining > 0 ? <>Te faltan <strong>{fmt(remaining)}</strong> para envío gratis</> : <>🎉 ¡Tienes <strong>envío gratis</strong>!</>}</p>
                <div className="ship-track"><div style={{ width: `${Math.min(100, (subtotal / min) * 100)}%` }} /></div>
              </div>
            )}
            <div className="drawer-body">
              {lines.length === 0 ? (
                <div className="drawer-empty"><span>🛍️</span><p>Tu carrito está vacío</p><button type="button" className="btn-ghost" onClick={onClose}>Seguir viendo</button></div>
              ) : lines.map(({ product: p, qty }) => (
                <div className="cart-line" key={p.id}>
                  <div className="cart-thumb">{p.photo ? <img src={p.photo} alt="" /> : <span>💎</span>}</div>
                  <div className="cart-info">
                    <p className="cart-name">{p.name}</p>
                    <p className="cart-price">{fmt(p.salePrice)}</p>
                    <Stepper qty={qty} max={p.stock} label={p.name}
                      onDec={() => onQty(p.id, qty - 1, p.stock)} onInc={() => onQty(p.id, qty + 1, p.stock)} />
                  </div>
                  <p className="cart-sub">{fmt(p.salePrice * qty)}</p>
                </div>
              ))}
            </div>
            {lines.length > 0 && (
              <footer className="drawer-foot">
                <div className="sum-row"><span>Subtotal</span><strong>{fmt(subtotal)}</strong></div>
                <p className="muted">El envío se coordina contigo por WhatsApp.</p>
                <button type="button" className="btn-cta" onClick={goCheckout}>{customer ? 'Continuar' : 'Ingresar para continuar'}</button>
              </footer>
            )}
          </>
        )}

        {view === 'checkout' && (
          <form className="drawer-form" onSubmit={submit} noValidate>
            <div className="drawer-body">
              <label className="field"><span className="field-label">Nombre</span>
                <input className="input" value={form.name} onChange={set('name')} autoComplete="name" />
                {errors.name && <span className="field-error">{errors.name}</span>}</label>
              <label className="field"><span className="field-label">Teléfono / WhatsApp</span>
                <input className="input" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                {errors.phone && <span className="field-error">{errors.phone}</span>}</label>
              <label className="field"><span className="field-label">Dirección de envío</span>
                <textarea className="input" rows={2} value={form.address} onChange={set('address')} autoComplete="street-address" />
                {errors.address && <span className="field-error">{errors.address}</span>}</label>
              <label className="field"><span className="field-label">Notas (opcional)</span>
                <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} placeholder="Horario, referencias, regalo…" /></label>

              <div className="order-summary">
                {lines.map(l => <div className="sum-row" key={l.product.id}><span>{l.qty} × {l.product.name}</span><span>{fmt(l.product.salePrice * l.qty)}</span></div>)}
                <div className="sum-row total"><span>Total</span><strong>{fmt(subtotal)}</strong></div>
              </div>
              <p className="muted">Pagas al coordinar la entrega; no se cobra nada en línea.</p>
              {formError && <div className="form-error" role="alert">⚠️ {formError}</div>}
            </div>
            <footer className="drawer-foot">
              <button type="submit" className="btn-cta" disabled={busy}>{busy ? 'Enviando…' : 'Confirmar pedido'}</button>
              <button type="button" className="btn-ghost" onClick={() => setView('cart')} disabled={busy}>Volver al carrito</button>
            </footer>
          </form>
        )}

        {view === 'done' && done && (
          <>
            <div className="drawer-body done-view">
              <div className="done-check">✓</div>
              <p>Tu pedido <strong>#{done.code}</strong> quedó pendiente por <strong>{fmt(done.total)}</strong>.</p>
              <p className="muted">Escríbenos por WhatsApp para confirmar el pago y la entrega.</p>
              {!waHref && <p className="muted">Te contactaremos al {done.form.phone}.</p>}
            </div>
            <footer className="drawer-foot">
              {waHref && <a className="btn-cta btn-wa" href={waHref} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>}
              <button type="button" className="btn-ghost" onClick={onClose}>Seguir comprando</button>
            </footer>
          </>
        )}
      </motion.aside>
    </motion.div>
  )
}
