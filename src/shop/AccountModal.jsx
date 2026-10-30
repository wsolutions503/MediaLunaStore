import { useState } from 'react'
import { motion } from 'framer-motion'
import { registerCustomer, loginCustomer } from '../store'
import { useEscape } from './hooks'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error" role="alert">{error}</span>}
    </label>
  )
}

export default function AccountModal({ initialTab = 'login', reason, onClose, onAuth }) {
  useEscape(true, onClose)
  const [tab, setTab] = useState(initialTab)
  const [f, setF] = useState({ name: '', email: '', phone: '', address: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    if (tab === 'register') {
      if (f.name.trim().length < 2) e.name = 'Escribe tu nombre completo'
      if (f.phone.replace(/\D/g, '').length < 8) e.phone = 'Escribe un teléfono válido'
      if (f.address.trim().length < 8) e.address = 'Escribe tu dirección completa para el envío'
    }
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'Escribe un correo válido'
    if (f.password.length < (tab === 'register' ? 6 : 1)) e.password = tab === 'register' ? 'Mínimo 6 caracteres' : 'Escribe tu contraseña'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e); setFormError('')
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const customer = tab === 'register' ? await registerCustomer(f) : await loginCustomer(f.email, f.password)
      if (!customer) { setFormError('Correo o contraseña incorrectos.'); setBusy(false); return }
      onAuth(customer)
    } catch (err) {
      console.error(err)
      setFormError(err && !err.code && err.message ? err.message : 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.')
      setBusy(false)
    }
  }

  const switchTab = (t) => { setTab(t); setErrors({}); setFormError('') }

  return (
    <motion.div className="shop-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="shop-dialog account-dialog" role="dialog" aria-modal="true" aria-label="Mi cuenta"
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <h2 className="dialog-title">{tab === 'login' ? 'Bienvenida de vuelta' : 'Crea tu cuenta'}</h2>
        <p className="dialog-sub">{reason || (tab === 'login' ? 'Ingresa para ver tus pedidos y comprar más rápido.' : 'Guarda tus datos de envío y sigue tus pedidos.')}</p>

        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'login'} className={tab === 'login' ? 'on' : ''} onClick={() => switchTab('login')}>Ingresar</button>
          <button type="button" role="tab" aria-selected={tab === 'register'} className={tab === 'register' ? 'on' : ''} onClick={() => switchTab('register')}>Crear cuenta</button>
        </div>

        <form onSubmit={submit} noValidate className="form-stack">
          {tab === 'register' && (
            <Field label="Nombre completo" error={errors.name}>
              <input className="input" autoComplete="name" value={f.name} onChange={set('name')} placeholder="María Pérez" />
            </Field>
          )}
          <Field label="Correo" error={errors.email}>
            <input className="input" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="tucorreo@ejemplo.com" />
          </Field>
          {tab === 'register' && (
            <>
              <Field label="Teléfono / WhatsApp" error={errors.phone}>
                <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="7000-0000" />
              </Field>
              <Field label="Dirección de envío" error={errors.address}>
                <textarea className="input" rows={2} autoComplete="street-address" value={f.address} onChange={set('address')} placeholder="Colonia, calle, casa o referencia, municipio" />
              </Field>
            </>
          )}
          <Field label="Contraseña" error={errors.password}>
            <input className="input" type="password" autoComplete={tab === 'register' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'} />
          </Field>

          {formError && <div className="form-error" role="alert">⚠️ {formError}</div>}

          <button type="submit" className="btn-cta" disabled={busy}>
            {busy ? 'Un momento…' : tab === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
