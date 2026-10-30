import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import { getSales, getProducts, getUsers, fmt, fmtDate, CHANNELS, CHANNEL_ICONS } from '../store'

export default function ReportesPage({ user }) {
  const [period, setPeriod]         = useState('month')
  const [sellerFilter, setSellerFilter] = useState('')
  const [sales, setSales]           = useState([])
  const [products, setProducts]     = useState([])
  const [sellers, setSellers]       = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([getSales(), getProducts(), getUsers()]).then(([s, p, u]) => {
      setSales(s); setProducts(p)
      setSellers(u.filter(x => x.role === 'vendedor' || x.role === 'admin'))
      setLoading(false)
    })
  }, [])

  const filteredSales = useMemo(() => {
    const now = new Date()
    return sales.filter(s => {
      const d = new Date(s.createdAt)
      let matchPeriod = true
      if (period === 'week')  { const w = new Date(); w.setDate(now.getDate()-7); matchPeriod = d >= w }
      if (period === 'month') matchPeriod = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      if (period === 'year')  matchPeriod = d.getFullYear() === now.getFullYear()
      return matchPeriod && (!sellerFilter || s.sellerId === sellerFilter)
    })
  }, [sales, period, sellerFilter])

  const metrics = useMemo(() => {
    const paid = filteredSales.filter(s => s.paymentStatus === 'pagado')
    const revenue = paid.reduce((a, s) => a + (s.total || 0), 0)
    const cost    = paid.reduce((a, s) => a + (s.items || []).reduce((b, i) => b + (i.costPrice || 0) * i.qty, 0), 0)
    const profit  = revenue - cost
    return { total: filteredSales.length, paid: paid.length, revenue, cost, profit, roi: cost > 0 ? ((profit / cost) * 100).toFixed(1) : 0 }
  }, [filteredSales])

  const channelStats = useMemo(() => {
    const map = {}
    filteredSales.forEach(s => { if (!map[s.channel]) map[s.channel] = { name: s.channel, count: 0, revenue: 0 }; map[s.channel].count++; if (s.paymentStatus === 'pagado') map[s.channel].revenue += s.total || 0 })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [filteredSales])

  const sellerStats = useMemo(() => {
    const map = {}
    filteredSales.forEach(s => { if (!map[s.sellerId]) map[s.sellerId] = { name: s.sellerName || s.sellerId, count: 0, revenue: 0 }; map[s.sellerId].count++; if (s.paymentStatus === 'pagado') map[s.sellerId].revenue += s.total || 0 })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [filteredSales])

  const topProducts = useMemo(() => {
    const map = {}
    filteredSales.forEach(s => { s.items?.forEach(i => { if (!map[i.productId]) map[i.productId] = { name: i.name, qty: 0, revenue: 0, cost: 0 }; map[i.productId].qty += i.qty; map[i.productId].revenue += i.salePrice * i.qty; map[i.productId].cost += (i.costPrice || 0) * i.qty }) })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
  }, [filteredSales])

  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const label = new Date(new Date().getFullYear(), i, 1).toLocaleDateString('es-SV', { month: 'short' })
      const rev = sales.filter(s => { const d = new Date(s.createdAt); return d.getMonth() === i && d.getFullYear() === new Date().getFullYear() && s.paymentStatus === 'pagado' && (!sellerFilter || s.sellerId === sellerFilter) }).reduce((a, s) => a + (s.total || 0), 0)
      return { mes: label, ingresos: parseFloat(rev.toFixed(2)) }
    })
  }, [sales, sellerFilter])

  function exportExcel() {
    const rows = filteredSales.map(s => ({ 'Fecha': fmtDate(s.createdAt), 'Cliente': s.customerName, 'Canal': s.channel, 'Vendedor': s.sellerName, 'Total ($)': s.total, 'Estado pago': s.paymentStatus, 'Estado envío': s.status, 'Productos': s.items?.map(i => `${i.name} x${i.qty}`).join(', ') }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
    XLSX.writeFile(wb, `reporte_ventas_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const fadeUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }
  if (loading) return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)' }}>⏳ Cargando reportes...</div>

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div><h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.15rem' }}>Reportes</h2><p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: 2 }}>Métricas de ventas y rentabilidad</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['week','Semana'],['month','Mes'],['year','Año'],['all','Todo']].map(([v,l]) => (
              <button key={v} className={`btn btn-sm ${period === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod(v)}>{l}</button>
            ))}
          </div>
          <select className="input" style={{ width: 'auto' }} value={sellerFilter} onChange={e => setSellerFilter(e.target.value)}>
            <option value="">Todos los vendedores</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportExcel}>📊 Exportar Excel</button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Ingresos',     value: fmt(metrics.revenue), sub: `${metrics.paid} ventas pagadas`,              icon: '💰', color: '#f0c060' },
          { label: 'Ganancia',     value: fmt(metrics.profit),  sub: `Costo: ${fmt(metrics.cost)}`,                icon: '📈', color: '#34d399' },
          { label: 'ROI',          value: `${metrics.roi}%`,    sub: 'retorno sobre inversión',                    icon: '🎯', color: '#22d3ee' },
          { label: 'Total ventas', value: metrics.total,        sub: `${metrics.total - metrics.paid} pendientes`, icon: '🛍️', color: '#a78bfa' },
        ].map((s, i) => (
          <motion.div key={i} className="stat-card grad-border" {...fadeUp} transition={{ delay: i * 0.07 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div className="stat-label">{s.label}</div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-sub">{s.sub}</div></div>
              <span style={{ fontSize: '1.5rem', opacity: 0.6 }}>{s.icon}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div className="glass" style={{ padding: 20, marginBottom: 20 }} {...fadeUp} transition={{ delay: 0.28 }}>
        <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, color: 'var(--text2)' }}>📅 Tendencia mensual — {new Date().getFullYear()}</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyTrend} barSize={24}>
            <XAxis dataKey="mes" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`}/>
            <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [fmt(v), 'Ingresos']}/>
            <Bar dataKey="ingresos" fill="url(#barGrad)" radius={[4,4,0,0]}/>
            <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0c060"/><stop offset="100%" stopColor="#e8a830" stopOpacity={0.6}/></linearGradient></defs>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <motion.div className="glass" style={{ padding: 20 }} {...fadeUp} transition={{ delay: 0.35 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 14, color: 'var(--text2)' }}>📡 Por canal</p>
          {channelStats.length === 0 ? <div className="empty-state" style={{ padding: '20px 0' }}><p>Sin datos</p></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {channelStats.map(c => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text2)' }}>{CHANNEL_ICONS[c.name] || '🔗'} {c.name}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge badge-gray">{c.count} venta{c.count > 1 ? 's' : ''}</span>
                    <span style={{ color: 'var(--gold)', fontFamily: 'monospace', minWidth: 70, textAlign: 'right' }}>{fmt(c.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div className="glass" style={{ padding: 20 }} {...fadeUp} transition={{ delay: 0.42 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 14, color: 'var(--text2)' }}>👤 Por vendedor</p>
          {sellerStats.length === 0 ? <div className="empty-state" style={{ padding: '20px 0' }}><p>Sin datos</p></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sellerStats.map((s, i) => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: ['#f0c060','#f472b6','#22d3ee','#a78bfa'][i%4], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#1a0f00' }}>{s.name[0]}</span>
                    {s.name}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-gray">{s.count}</span>
                    <span style={{ color: 'var(--gold)', fontFamily: 'monospace', minWidth: 70, textAlign: 'right' }}>{fmt(s.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <motion.div className="glass" style={{ overflow: 'hidden' }} {...fadeUp} transition={{ delay: 0.5 }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text2)' }}>🏆 Productos — rentabilidad</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Producto</th><th>Uds.</th><th>Ingresos</th><th>Costo</th><th>Ganancia</th><th>Margen</th></tr></thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state" style={{ padding: '28px 0' }}><p>Sin ventas en el período</p></div></td></tr>
              ) : topProducts.map((p, i) => {
                const g = p.revenue - p.cost; const m = p.cost > 0 ? ((g / p.cost) * 100).toFixed(1) : '—'
                return (
                  <tr key={p.name}>
                    <td style={{ color: 'var(--text3)', fontWeight: 700 }}>#{i+1}</td>
                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>💎 {p.name}</td>
                    <td style={{ color: 'var(--cyan)' }}>{p.qty}</td>
                    <td style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{fmt(p.revenue)}</td>
                    <td style={{ color: 'var(--text3)', fontFamily: 'monospace' }}>{fmt(p.cost)}</td>
                    <td style={{ color: 'var(--emerald)', fontFamily: 'monospace' }}>{fmt(g)}</td>
                    <td><span className="badge badge-green">{m}%</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
