import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { seedIfEmpty, getSession, clearSession, getLowStockProducts, getPendingOnlineOrderCount, ROLES } from './store'
import { useToast } from './hooks/useToast'
import LoginPage     from './pages/LoginPage'
const DashboardPage  = lazy(() => import('./pages/DashboardPage'))
const InventarioPage = lazy(() => import('./pages/InventarioPage'))
const VentasPage     = lazy(() => import('./pages/VentasPage'))
const ReportesPage   = lazy(() => import('./pages/ReportesPage'))
const ConfigPage     = lazy(() => import('./pages/ConfigPage'))
const TiendaPage     = lazy(() => import('./shop/TiendaPage'))

const isShopHash = () => /^#\/tienda/.test(window.location.hash)

// ── Gradient border nav card ────────────────────────────────────────────────
function GradientNavCard({ item, active, onClick }) {
  const cardRef = useRef(null)
  useEffect(() => {
    const handleMouseMove = (e) => {
      const card = cardRef.current
      if (!card) return
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    }
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <button ref={cardRef} onClick={onClick} style={{ position: 'relative', width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', borderRadius: 10, '--accent': item.accent }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 10, padding: '1px', background: `radial-gradient(140px circle at var(--mouse-x,50%) var(--mouse-y,50%), ${item.accent} 0%, transparent 70%)`, WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', opacity: active ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: `radial-gradient(100px circle at var(--mouse-x,50%) var(--mouse-y,50%), ${item.accent}18, transparent 70%)`, opacity: active ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: active ? 'rgba(255,255,255,0.06)' : 'transparent', transition: 'background 0.2s' }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
        <span style={{ fontSize: '0.84rem', fontFamily: 'var(--font-head)', fontWeight: active ? 700 : 500, color: active ? item.accent : 'var(--text3)', transition: 'color 0.2s' }}>{item.label}</span>
      </div>
    </button>
  )
}

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: '✦',  accent: '#f0c060', roles: ['superadmin','admin','vendedor'] },
  { id: 'inventario', label: 'Inventario', icon: '💎',  accent: '#22d3ee', roles: ['superadmin','admin'] },
  { id: 'ventas',     label: 'Ventas',     icon: '🛍️', accent: '#f472b6', roles: ['superadmin','admin','vendedor'] },
  { id: 'reportes',   label: 'Reportes',   icon: '📊',  accent: '#34d399', roles: ['superadmin','admin'] },
  { id: 'config',     label: 'Config',     icon: '⚙️',  accent: '#a78bfa', roles: ['superadmin','admin'] },
]

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} className="toast" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  const [shop, setShop] = useState(isShopHash)
  useEffect(() => {
    const h = () => setShop(isShopHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  if (shop) return <Suspense fallback={<Splash text="Cargando tienda..." />}><TiendaPage /></Suspense>
  return <StaffApp />
}

function Splash({ text, error, onRetry }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg)', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem' }}>💎</div>
      <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--gold), var(--rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Glamour</p>
      <p style={{ fontSize: '0.8rem', color: error ? 'var(--red)' : 'var(--text3)' }}>{text}</p>
      {onRetry && <button className="btn btn-primary" onClick={onRetry}>Reintentar</button>}
    </div>
  )
}

function StaffApp() {
  const [user, setUser]         = useState(getSession)
  const [page, setPage]         = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [seeded, setSeeded]     = useState(false)
  const [seedError, setSeedError] = useState(false)
  const [onlinePending, setOnlinePending] = useState(0)
  const [lowStock, setLowStock] = useState(0)
  const { toasts, addToast }    = useToast()

  // Seed Firestore on first load
  const boot = () => { setSeedError(false); seedIfEmpty().then(() => setSeeded(true)).catch(e => { console.error(e); setSeedError(true) }) }
  useEffect(() => { boot() }, [])

  // Refresh low stock count when page changes
  useEffect(() => {
    if (!user) return
    getLowStockProducts().then(list => setLowStock(list.length)).catch(() => {})
    getPendingOnlineOrderCount().then(setOnlinePending).catch(() => {})
  }, [page, user])

  const nav = NAV.filter(n => n.roles.includes(user?.role))
  const validPage = nav.find(n => n.id === page) ? page : nav[0]?.id || 'dashboard'

  function handleLogin(u) { setUser(u); setPage('dashboard') }
  function handleLogout() { clearSession(); setUser(null) }

  // Loading screen while seeding
  if (seedError) return <Splash error text="No se pudo conectar con la base de datos. Revisa tu internet o las reglas de Firestore." onRetry={boot} />
  if (!seeded) return <Splash text="Conectando con la base de datos..." />

  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />}

      <aside style={{ width: 220, background: 'rgba(6,8,15,0.95)', backdropFilter: 'blur(20px)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 12px', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100 }} className={`sidebar-desktop${sidebarOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '4px 12px 24px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>💎</span>
            <div>
              <p style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, var(--gold), var(--rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.2 }}>Glamour</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Media Luna Store</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nav.map(item => (
            <div key={item.id} style={{ position: 'relative' }}>
              <GradientNavCard item={item} active={validPage === item.id} onClick={() => { setPage(item.id); setSidebarOpen(false) }} />
              {item.id === 'ventas' && onlinePending > 0 && (
                <div title="Pedidos online pendientes" style={{ position: 'absolute', top: 6, right: 8, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: 'var(--rose)', color: '#fff', fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>{onlinePending}</div>
              )}
              {item.id === 'inventario' && lowStock > 0 && (
                <div style={{ position: 'absolute', top: 6, right: 8, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', color: '#fff', fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>{lowStock}</div>
              )}
            </div>
          ))}
        </nav>

        <a href={`${window.location.pathname}#/tienda`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', margin: '0 4px 12px', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border2)', color: 'var(--gold)', fontSize: '0.82rem', textDecoration: 'none', textAlign: 'center' }}>🛒 Ver tienda ↗</a>
        {/* User info */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(240,192,96,0.15)', border: '1px solid rgba(240,192,96,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gold)' }}>
              {user.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>{ROLES[user.role]}</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '1rem', padding: '4px' }} title="Cerrar sesión">↩</button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: 220, padding: '24px 28px', minWidth: 0 }} className="main-content">
        {/* Mobile header */}
        <div className="mobile-header" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '0 0 16px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '1.3rem' }}>☰</button>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, background: 'linear-gradient(135deg, var(--gold), var(--rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>💎 Glamour</span>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '0.9rem' }}>↩</button>
        </div>

        <Suspense fallback={null}><AnimatePresence mode="wait">
          <motion.div key={validPage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {validPage === 'dashboard'  && <DashboardPage  user={user} />}
            {validPage === 'inventario' && <InventarioPage user={user} toast={addToast} />}
            {validPage === 'ventas'     && <VentasPage     user={user} toast={addToast} />}
            {validPage === 'reportes'   && <ReportesPage   user={user} />}
            {validPage === 'config'     && <ConfigPage     user={user} toast={addToast} />}
          </motion.div>
        </AnimatePresence></Suspense>
      </main>

      <ToastContainer toasts={toasts} />

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { transform: translateX(-100%); }
          .sidebar-desktop { transition: transform .25s; }
          .sidebar-desktop.open { transform: translateX(0); }
          .main-content { margin-left: 0 !important; padding: 16px !important; }
          .mobile-header { display: flex !important; }
        }
        @media (min-width: 769px) {
          .sidebar-desktop { transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  )
}
