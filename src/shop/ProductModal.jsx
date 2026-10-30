import { motion } from 'framer-motion'
import { fmt } from '../store'
import { useEscape } from './hooks'
import { Stepper, isNewProduct } from './ProductCard'

export default function ProductModal({ product: p, category, qty, onClose, onAdd, onInc, onDec, onOpenCart }) {
  useEscape(true, onClose)
  const low = p.stock <= 3

  return (
    <motion.div className="shop-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="shop-dialog product-dialog" role="dialog" aria-modal="true" aria-label={p.name}
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <div className="product-dialog-media">
          {p.photo
            ? <img src={p.photo} alt={p.name} />
            : <span className="card-media-ph" aria-hidden="true">{category?.icon || '💎'}</span>}
        </div>

        <div className="product-dialog-body">
          <div className="product-dialog-tags">
            {category && <span className="card-cat" style={{ color: category.color }}>{category.icon} {category.name}</span>}
            {isNewProduct(p) && <span className="pill pill-new">Nuevo</span>}
          </div>
          <h2>{p.name}</h2>
          <p className="product-dialog-price">{fmt(p.salePrice)}</p>
          {p.description && <p className="product-dialog-desc">{p.description}</p>}
          <p className={`product-dialog-stock ${low ? 'is-low' : ''}`}>
            {low ? (p.stock === 1 ? 'Queda 1 unidad' : `Quedan solo ${p.stock} unidades`) : 'Disponible'}
          </p>

          <div className="product-dialog-actions">
            {qty === 0 ? (
              <button type="button" className="btn-cta" onClick={() => onAdd(p)}>Agregar al carrito</button>
            ) : (
              <>
                <Stepper qty={qty} max={p.stock} label={p.name} onDec={() => onDec(p)} onInc={() => onInc(p)} />
                <button type="button" className="btn-cta" onClick={onOpenCart}>Ver mi carrito</button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
