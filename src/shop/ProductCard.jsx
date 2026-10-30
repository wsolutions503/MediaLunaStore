import { motion } from 'framer-motion'
import { fmt } from '../store'

const NEW_DAYS = 14

export function isNewProduct(p) {
  return !!p.createdAt && Date.now() - new Date(p.createdAt).getTime() < NEW_DAYS * 864e5
}

export function Stepper({ qty, max, onDec, onInc, label }) {
  return (
    <div className="stepper" role="group" aria-label={`Cantidad de ${label}`}>
      <button type="button" onClick={onDec} aria-label={qty === 1 ? `Quitar ${label} del carrito` : 'Una unidad menos'}>
        {qty === 1 ? '🗑' : '−'}
      </button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={onInc} disabled={qty >= max} aria-label="Una unidad más">+</button>
    </div>
  )
}

/**
 * Tarjeta de producto: vidrio esmerilado + borde degradado que sigue al cursor.
 * El color del brillo viene de la categoría del producto.
 */
export default function ProductCard({ product: p, category, qty, index, onOpen, onAdd, onInc, onDec }) {
  const handleMove = (e) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const low = p.stock <= 3

  return (
    <motion.article
      className="glow-card"
      style={{ '--accent': category?.color || '#f0c060' }}
      onMouseMove={handleMove}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.04 }}
    >
      <div className="glow-inner">
        <button type="button" className="card-media" onClick={() => onOpen(p)} aria-label={`Ver detalle de ${p.name}`}>
          {p.photo
            ? <img src={p.photo} alt={p.name} loading="lazy" decoding="async" />
            : <span className="card-media-ph" aria-hidden="true">{category?.icon || '💎'}</span>}
          <span className="card-badges">
            {isNewProduct(p) && <span className="pill pill-new">Nuevo</span>}
            {low && <span className="pill pill-low">{p.stock === 1 ? 'Última unidad' : `Últimas ${p.stock}`}</span>}
          </span>
        </button>

        <div className="card-body">
          {category && <span className="card-cat" style={{ color: category.color }}>{category.icon} {category.name}</span>}
          <h3 className="card-name"><button type="button" onClick={() => onOpen(p)}>{p.name}</button></h3>
          <p className="card-price">{fmt(p.salePrice)}</p>

          <div className="card-actions">
            {qty === 0 ? (
              <button type="button" className="btn-add" onClick={() => onAdd(p)}>
                <span className="btn-add-long">Agregar al carrito</span>
                <span className="btn-add-short">Agregar</span>
              </button>
            ) : (
              <Stepper qty={qty} max={p.stock} label={p.name} onDec={() => onDec(p)} onInc={() => onInc(p)} />
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
}
