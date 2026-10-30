import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getCustomerOrders, fmt, fmtDate, SALE_STATUS, PAY_STATUS } from '../store'
import { useEscape } from './hooks'

export default function OrdersModal({ customer, onClose }) {
  useEscape(true, onClose)
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    getCustomerOrders(customer.id)
      .then(o => alive && setOrders([...o].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))))
      .catch(() => alive && setError(true))
    return () => { alive = false }
  }, [customer.id])

  const label = (map, k) => (map?.[k]?.label ?? map?.[k] ?? k)

  return (
    <motion.div className="shop-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="shop-dialog orders-dialog" role="dialog" aria-modal="true" aria-label="Mis pedidos"
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Cerrar">✕</button>
        <h2 className="dialog-title">Mis pedidos</h2>
        {error && <div className="form-error">No pudimos cargar tus pedidos. Intenta de nuevo.</div>}
        {!error && orders === null && <p className="muted">Cargando…</p>}
        {orders && orders.length === 0 && <p className="muted">Aún no tienes pedidos.</p>}
        <div className="orders-list">
          {orders?.map(o => (
            <div className="order-card" key={o.id}>
              <div className="order-top">
                <strong>#{o.id.slice(-6).toUpperCase()}</strong>
                <span className="muted">{fmtDate(o.createdAt || o.date)}</span>
              </div>
              <ul>{(o.items || []).map((i, n) => <li key={n}>{i.qty} × {i.name}</li>)}</ul>
              <div className="order-bottom">
                <span className="status-chip">{label(SALE_STATUS, o.status)}</span>
                <span className="status-chip">{label(PAY_STATUS, o.paymentStatus)}</span>
                <strong>{fmt(o.total)}</strong>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
