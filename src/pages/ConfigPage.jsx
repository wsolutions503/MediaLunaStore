import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getUsers, addUser, updateUser, deleteUser, getCategories, addCategory, deleteCategory, getSettings, saveSettings, ROLES } from '../store'

const EMPTY_USER = { name: '', email: '', password: '', role: 'vendedor' }
const EMPTY_CAT  = { name: '', icon: '✨', color: '#f0c060' }

export default function ConfigPage({ user, toast }) {
  const [tab, setTab]           = useState('users')
  const [users, setUsers]       = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState({ storeName: 'Media Luna Store', currency: 'USD', lowStockAlert: true })
  const [loading, setLoading]   = useState(true)
  const [userModal, setUserModal] = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [userForm, setUserForm]   = useState(EMPTY_USER)
  const [catForm, setCatForm]     = useState(EMPTY_CAT)
  const [saving, setSaving]       = useState(false)

  const loadData = async () => {
    const [u, c, s] = await Promise.all([getUsers(), getCategories(), getSettings()])
    setUsers(u); setCategories(c); if (s) setSettings(s); setLoading(false)
  }
  useEffect(() => { loadData() }, [])

  function openNewUser() { setUserForm(EMPTY_USER); setEditUser(null); setUserModal(true) }
  function openEditUser(u) { setUserForm({ name: u.name, email: u.email, password: u.password, role: u.role }); setEditUser(u); setUserModal(true) }

  async function handleSaveUser() {
    if (!userForm.name || !userForm.email || !userForm.password) return
    setSaving(true)
    if (editUser) { await updateUser(editUser.id, userForm) }
    else { await addUser({ ...userForm, active: true }) }
    setSaving(false); setUserModal(false); toast('✓ Usuario guardado'); loadData()
  }

  async function handleDeleteUser(id) {
    if (id === user.id) { toast('No puedes eliminar tu propio usuario'); return }
    await deleteUser(id); toast('Usuario eliminado'); loadData()
  }

  async function handleAddCat() {
    if (!catForm.name) return
    await addCategory(catForm); setCatForm(EMPTY_CAT); toast('✓ Categoría agregada'); loadData()
  }

  async function handleSaveSettings() {
    await saveSettings(settings); toast('✓ Configuración guardada')
  }

  const tabs = [{ id: 'users', label: '👥 Usuarios' }, { id: 'cats', label: '🏷️ Categorías' }, { id: 'settings', label: '⚙️ General' }]

  if (loading) return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)' }}>⏳ Cargando configuración...</div>

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}><h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.15rem' }}>Configuración</h2></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {tabs.map(t => <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={openNewUser}>✦ Nuevo usuario</button>
          </div>
          <div className="glass" style={{ overflow: 'hidden' }}>
            <table>
              <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.role === 'superadmin' ? 'rgba(240,192,96,0.2)' : u.role === 'admin' ? 'rgba(34,211,238,0.15)' : 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: u.role === 'superadmin' ? 'var(--gold)' : u.role === 'admin' ? 'var(--cyan)' : 'var(--violet)' }}>{u.name[0].toUpperCase()}</div>
                        {u.name} {u.id === user.id && <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>Tú</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{u.email}</td>
                    <td><span className={`badge ${u.role === 'superadmin' ? 'badge-gold' : u.role === 'admin' ? 'badge-cyan' : 'badge-violet'}`}>{ROLES[u.role]}</span></td>
                    <td><span className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>{u.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditUser(u)}>✏️</button>
                        {u.id !== user.id && <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id)}>🗑️</button>}
                        <button className="btn btn-ghost btn-sm" onClick={async () => { await updateUser(u.id, { active: !u.active }); loadData() }}>{u.active ? '⏸️' : '▶️'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'cats' && (
        <div>
          <div className="glass" style={{ padding: 18, marginBottom: 16 }}>
            <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>Nueva categoría</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px auto', gap: 10, alignItems: 'end' }}>
              <div><label className="label">Nombre</label><input className="input" placeholder="Ej. Tiaras" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}/></div>
              <div><label className="label">Ícono</label><input className="input" placeholder="💎" value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))}/></div>
              <div><label className="label">Color</label><input className="input" type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} style={{ padding: '4px', height: 38, cursor: 'pointer' }}/></div>
              <button className="btn btn-primary" onClick={handleAddCat} disabled={!catForm.name}>✦ Agregar</button>
            </div>
          </div>
          <div className="glass" style={{ overflow: 'hidden' }}>
            <table>
              <thead><tr><th>Categoría</th><th>Color</th><th></th></tr></thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td><span style={{ fontSize: '1.1rem', marginRight: 8 }}>{c.icon}</span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{c.name}</span></td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text3)' }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, display: 'inline-block' }}/>{c.color}</span></td>
                    <td><button className="btn btn-danger btn-sm" onClick={async () => { await deleteCategory(c.id); toast('Categoría eliminada'); loadData() }}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ maxWidth: 480 }}>
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ marginBottom: 14 }}><label className="label">Nombre de la tienda</label><input className="input" value={settings.storeName || ''} onChange={e => setSettings(s => ({ ...s, storeName: e.target.value }))}/></div>
            <div style={{ marginBottom: 14 }}><label className="label">WhatsApp de la tienda (con código de país)</label><input className="input" inputMode="tel" placeholder="503 7000 0000" value={settings.whatsapp || ''} onChange={e => setSettings(s => ({ ...s, whatsapp: e.target.value }))}/><p style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 4 }}>A este número llegan los pedidos de la tienda online.</p></div>
            <div style={{ marginBottom: 14 }}><label className="label">Envío gratis desde ($, 0 = desactivado)</label><input className="input" type="number" min="0" value={settings.freeShippingMin ?? 0} onChange={e => setSettings(s => ({ ...s, freeShippingMin: Math.max(0, Number(e.target.value) || 0) }))}/></div>
            <div style={{ marginBottom: 14 }}><label className="label">Enlace de la tienda</label><div style={{ display: 'flex', gap: 8 }}><input className="input" readOnly value={`${window.location.origin}${window.location.pathname}#/tienda`} onFocus={e => e.target.select()}/><button type="button" className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#/tienda`); toast('✓ Enlace copiado') }}>Copiar</button></div></div>
            <div style={{ marginBottom: 20 }}><label className="label">Moneda</label><select className="input" value={settings.currency || 'USD'} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}><option value="USD">USD — Dólar</option><option value="SVC">SVC — Colón</option></select></div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div><p style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text)' }}>Alertas de stock bajo</p><p style={{ fontSize: '0.74rem', color: 'var(--text3)' }}>Aviso cuando stock ≤ mínimo</p></div>
              <button onClick={() => setSettings(s => ({ ...s, lowStockAlert: !s.lowStockAlert }))} style={{ width: 44, height: 24, borderRadius: 12, background: settings.lowStockAlert ? 'var(--gold)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 3, left: settings.lowStockAlert ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }}/>
              </button>
            </div>
            <button className="btn btn-primary" onClick={handleSaveSettings}>✓ Guardar cambios</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {userModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && setUserModal(false)}>
            <motion.div className="modal" style={{ maxWidth: 420 }} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}>
              <div className="modal-title"><span>{editUser ? '✏️ Editar usuario' : '✦ Nuevo usuario'}</span><button className="btn btn-ghost btn-sm" onClick={() => setUserModal(false)}>✕</button></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label className="label">Nombre completo *</label><input className="input" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}/></div>
                <div><label className="label">Correo *</label><input className="input" type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}/></div>
                <div><label className="label">Contraseña *</label><input className="input" type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}/></div>
                <div><label className="label">Rol *</label>
                  <select className="input" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    {user.role === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
                    <option value="admin">Administrador</option>
                    <option value="vendedor">Vendedor</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => setUserModal(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSaveUser} disabled={saving || !userForm.name || !userForm.email || !userForm.password}>{saving ? '⌛ Guardando...' : '✓ Guardar'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
