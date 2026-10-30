import { useState } from 'react'
import { motion } from 'framer-motion'
import { login } from '../store'

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const user = await login(email.trim(), password)
    if (user) { onLogin(user) }
    else { setError('Credenciales incorrectas. Intenta de nuevo.'); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(240,192,96,0.12) 0%, transparent 60%), var(--bg)' }}>
      <div style={{ position: 'fixed', top: '-200px', left: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,192,96,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-200px', right: '-200px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,114,182,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>💎</div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--gold), var(--rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Glamour</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>Media Luna Store</p>
        </div>

        <div className="glass grad-border" style={{ padding: '32px 28px' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.05rem', marginBottom: '24px', color: 'var(--text2)' }}>Acceso al sistema</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label className="label">Correo</label>
              <input className="input" type="email" placeholder="correo@medialuna.sv" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label className="label">Contraseña</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-danger" style={{ marginBottom: '16px' }}>
                ⚠️ {error}
              </motion.div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.9rem' }} disabled={loading}>
              {loading ? '⌛ Verificando...' : '✦ Ingresar'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
