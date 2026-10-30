import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getSales, getProducts, getCategories, getCustomers, getLowStockProducts, fmt, fmtDate, CHANNELS, CHANNEL_ICONS } from '../store'

const CARD_COLORS = ['#f0c060', '#f472b6', '#22d3ee', '#a78bfa', '#34d399']

export default function DashboardPage({ user }) {
  const [sales, setSales]       = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([getSales(), getProducts(), getCustomers(), getLowStockProducts()])
      .then(([s, p, c, ls]) => { setSales(s); setProducts(p); setCustomers(c); setLowStock(ls); setLoading(false) })
  }, [])

  const stats = useMemo(() => {
    const now = new Date(); const m = now.getMonth(); const y = now.getFullYear()
    const thisMonth = sales.filter(s => { const d = new Date(s.createdAt); return d.getMonth() === m && d.getFullYear() === y && s.paymentStatus === 'pagado' })
    const total = thisMonth.reduce((a, s) => a + (s.total || 0), 0)
    const cost  = thisMonth.reduce((a, s) => a + (s.items || []).reduce((b, i) => b + (i.costPrice || 0) * i.qty, 0), 0)
    return { monthRevenue: total, profit: total - cost, roi: cost > 0 ? ((total - cost) / cost * 100).toFixed(1) : 0, totalSales: sales.length, paidSales: sales.filter(s => s.paymentStatus === 'pagado').length, customers: customers.length, products: products.filter(p => p.active).length }
  }, [sales, products, customers])

  const dailyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const label = d.toLocaleDateString('es-SV', { weekday: 'short' })
      const rev = sales.filter(s => new Date(s.createdAt).toDateString() === d.toDateString() && s.paymentStatus === 'pagado').reduce((a, s) => a + (s.total || 0), 0)
      return { day: label, ventas: parseFloat(rev.toFixed(2)) }
    })
  }, [sales])

  const channelData = useMemo(() => {
    const map = {}
    sales.forEach(s => { map[s.channel] = (map[s.channel] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [sales])

  const topProducts = useMemo(() => {
    const map = {}
    sales.forEach(s => { s.items?.forEach(i => { map[i.productId] = (map[i.productId] || 0) + i.qty }) })
    return Object.entries(map).map(([id, qty]) => ({ product: products.find(p => p.id === id), qty })).filter(x => x.product).sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [sales, products])

  const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

  if (loading) return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)' }}>⏳ Cargando dashboard...</div>

  return (
    <div style={{ paddingBottom: 40 }}>
      {lowStock.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0 }} style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>🔔</span>
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--red)', marginBottom: '4px' }}>{lowStock.length} producto{lowStock.length > 1 ? 's' : ''} con stock bajo</p>
            <p style={{ fontSize: '0.77rem', color: 'var(--text3)' }}>{lowStock.map(p => p.name).join(' · ')}</p>
          </div>
        </motion.div>
      )}

      <div className="grid-4" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Ingresos del mes', value: fmt(stats.monthRevenue), sub: 'ventas pagadas',              icon: '💰', accent: '#f0c060' },
          { label: 'Ganancia bruta',   value: fmt(stats.profit),       sub: `ROI: ${stats.roi}%`,          icon: '📈', accent: '#34d399' },
          { label: 'Ventas totales',   value: stats.totalSales,        sub: `${stats.paidSales} pagadas`,  icon: '🛍️', accent: '#22d3ee' },
          { label: 'Clientes',         value: stats.customers,         sub: `${stats.products} productos`, icon: '👤', accent: '#a78bfa' },
        ].map((s, i) => (
          <motion.div key={i} className="stat-card grad-border" {...fadeUp} transition={{ delay: i * 0.07 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div className="stat-label">{s.label}</div><div className="stat-value" style={{ color: s.accent }}>{s.value}</div><div className="stat-sub">{s.sub}</div></div>
              <span style={{ fontSize: '1.5rem', opacity: 0.6 }}>{s.icon}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '24px' }}>
        <motion.div className="glass" style={{ padding: '20px' }} {...fadeUp} transition={{ delay: 0.28 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text2)' }}>💵 Ingresos — últimos 7 días</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData}>
              <defs><linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f0c060" stopOpacity={0.35}/><stop offset="95%" stopColor="#f0c060" stopOpacity={0.02}/></linearGradient></defs>
              <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`}/>
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} formatter={v => [fmt(v), 'Ventas']}/>
              <Area type="monotone" dataKey="ventas" stroke="#f0c060" strokeWidth={2} fill="url(#gGold)"/>
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="glass" style={{ padding: '20px' }} {...fadeUp} transition={{ delay: 0.35 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text2)' }}>📡 Ventas por canal</p>
          {channelData.length === 0 ? <div className="empty-state" style={{ padding: '32px 0' }}><p>Sin ventas aún</p></div> : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart><Pie data={channelData} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={3}>{channelData.map((_, i) => <Cell key={i} fill={CARD_COLORS[i % CARD_COLORS.length]}/>)}</Pie><Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}/></PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {channelData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.77rem', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: CARD_COLORS[i % CARD_COLORS.length], display: 'inline-block' }}/><span style={{ color: 'var(--text2)' }}>{CHANNEL_ICONS[d.name] || '🔗'} {d.name}</span></span>
                    <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      <motion.div className="glass" style={{ padding: '20px' }} {...fadeUp} transition={{ delay: 0.42 }}>
        <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text2)' }}>🏆 Productos más vendidos</p>
        {topProducts.length === 0 ? <div className="empty-state"><p>Registra ventas para ver estadísticas aquí</p></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topProducts.map(({ product: p, qty }, i) => {
              const max = topProducts[0].qty
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text3)', width: '16px' }}>#{i + 1}</span>
                  <span style={{ fontSize: '1.1rem' }}>{p.photo ? <img src={p.photo} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}/> : '💎'}</span>
                  <span style={{ flex: 1, fontSize: '0.84rem', color: 'var(--text2)' }}>{p.name}</span>
                  <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99 }}><div style={{ width: `${(qty / max) * 100}%`, height: '100%', background: CARD_COLORS[i], borderRadius: 99 }}/></div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: CARD_COLORS[i], width: '28px', textAlign: 'right' }}>{qty}</span>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
