import { useState, useEffect, useCallback } from 'react'

const CART_KEY = 'glam_cart'

function loadCart() {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY))
    return Array.isArray(v) ? v.filter(i => i && i.productId && i.qty > 0) : []
  } catch { return [] }
}

/** Carrito persistente en el navegador. Solo guarda { productId, qty }. */
export function useCart() {
  const [items, setItems] = useState(loadCart)

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)) } catch { /* modo privado */ }
  }, [items])

  const setQty = useCallback((productId, qty, max = Infinity) => {
    const q = Math.min(Math.floor(qty), max)
    setItems(prev => {
      if (q < 1) return prev.filter(i => i.productId !== productId)
      if (prev.some(i => i.productId === productId)) return prev.map(i => i.productId === productId ? { ...i, qty: q } : i)
      return [...prev, { productId, qty: q }]
    })
  }, [])

  const clear = useCallback(() => setItems([]), [])

  // Quita productos que ya no existen y ajusta cantidades al stock actual
  const reconcile = useCallback((products) => {
    const byId = new Map(products.map(p => [p.id, p]))
    setItems(prev => {
      const next = prev
        .filter(i => byId.has(i.productId))
        .map(i => ({ ...i, qty: Math.min(i.qty, byId.get(i.productId).stock) }))
        .filter(i => i.qty > 0)
      const same = next.length === prev.length && next.every((n, k) => n.qty === prev[k].qty)
      return same ? prev : next
    })
  }, [])

  return { items, setQty, clear, reconcile }
}

/** Cierra con la tecla Escape mientras `active` sea true. */
export function useEscape(active, onClose) {
  useEffect(() => {
    if (!active) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active, onClose])
}

/** Bloquea el scroll del fondo mientras haya un panel abierto. */
export function useScrollLock(locked) {
  useEffect(() => {
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [locked])
}
