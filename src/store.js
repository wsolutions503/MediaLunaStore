// ─────────────────────────────────────────────
//  store.js — Firestore persistence layer
// ─────────────────────────────────────────────
import { db } from './firebase'
import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  query, where, runTransaction,
} from 'firebase/firestore'

// ── Collections ────────────────────────────────────────────────────────────
export const COLS = {
  USERS:      'users',
  PRODUCTS:   'products',
  CATEGORIES: 'categories',
  SALES:      'sales',
  CUSTOMERS:  'customers',
  SETTINGS:   'settings',
}

// ── Generic helpers ────────────────────────────────────────────────────────
export async function getAll(col) {
  const snap = await getDocs(collection(db, col))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getOne(col, id) {
  const snap = await getDoc(doc(db, col, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function addItem(col, data) {
  const payload = { ...data, createdAt: new Date().toISOString() }
  const ref = await addDoc(collection(db, col), payload)
  return { id: ref.id, ...payload }
}

export async function setItem(col, id, data) {
  await setDoc(doc(db, col, id), data, { merge: true })
}

export async function updateItem(col, id, data) {
  await updateDoc(doc(db, col, id), data)
}

export async function deleteItem(col, id) {
  await deleteDoc(doc(db, col, id))
}

async function whereEq(col, field, value) {
  const snap = await getDocs(query(collection(db, col), where(field, '==', value)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── Defaults ───────────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  storeName: 'Media Luna Store',
  currency: 'USD',
  lowStockAlert: true,
  whatsapp: '',          // número de WhatsApp de la tienda (con o sin código de país)
  freeShippingMin: 0,    // 0 = no mostrar promoción de envío gratis
}

// ── Seed initial data (runs once if collections are empty) ──────────────────
export async function seedIfEmpty() {
  const users = await getAll(COLS.USERS)
  if (users.length === 0) {
    const now = new Date().toISOString()
    await setItem(COLS.USERS, 'u1', { name: 'Super Admin',   email: 'super@medialuna.sv', password: 'super123', role: 'superadmin', active: true, createdAt: now })
    await setItem(COLS.USERS, 'u2', { name: 'Administrador', email: 'admin@medialuna.sv', password: 'admin123', role: 'admin',      active: true, createdAt: now })
    await setItem(COLS.USERS, 'u3', { name: 'Vendedor Demo', email: 'venta@medialuna.sv', password: 'venta123', role: 'vendedor',   active: true, createdAt: now })
  }

  const cats = await getAll(COLS.CATEGORIES)
  if (cats.length === 0) {
    await setItem(COLS.CATEGORIES, 'c1', { name: 'Collares', icon: '📿', color: '#f0c060' })
    await setItem(COLS.CATEGORIES, 'c2', { name: 'Anillos',  icon: '💍', color: '#f472b6' })
    await setItem(COLS.CATEGORIES, 'c3', { name: 'Aretes',   icon: '✨', color: '#22d3ee' })
    await setItem(COLS.CATEGORIES, 'c4', { name: 'Pulseras', icon: '📿', color: '#a78bfa' })
    await setItem(COLS.CATEGORIES, 'c5', { name: 'Broches',  icon: '🔮', color: '#34d399' })
  }

  const settings = await getOne(COLS.SETTINGS, 'config')
  if (!settings) await setItem(COLS.SETTINGS, 'config', DEFAULT_SETTINGS)
}

// ── Session del personal (localStorage — solo local) ───────────────────────
export function getSession()      { try { return JSON.parse(localStorage.getItem('glam_session')) } catch { return null } }
export function setSession(user)  { localStorage.setItem('glam_session', JSON.stringify(user)) }
export function clearSession()    { localStorage.removeItem('glam_session') }

export async function login(email, password) {
  const users = await getAll(COLS.USERS)
  const user  = users.find(u => u.email === email && u.password === password && u.active)
  if (user) { const { password: _, ...safe } = user; setSession(safe); return safe }
  return null
}

// ── Users ──────────────────────────────────────────────────────────────────
export const getUsers    = ()       => getAll(COLS.USERS)
export const addUser     = (data)   => addItem(COLS.USERS, data)
export const updateUser  = (id, d)  => updateItem(COLS.USERS, id, d)
export const deleteUser  = (id)     => deleteItem(COLS.USERS, id)

// ── Categories ─────────────────────────────────────────────────────────────
export const getCategories   = ()      => getAll(COLS.CATEGORIES)
export const addCategory     = (data)  => addItem(COLS.CATEGORIES, data)
export const deleteCategory  = (id)    => deleteItem(COLS.CATEGORIES, id)

// ── Products ───────────────────────────────────────────────────────────────
export const getProducts    = ()       => getAll(COLS.PRODUCTS)
export const addProduct     = (data)   => addItem(COLS.PRODUCTS, { ...data, active: true })
export const updateProduct  = (id, d)  => updateItem(COLS.PRODUCTS, id, d)
export const deleteProduct  = (id)     => deleteItem(COLS.PRODUCTS, id)

export async function getLowStockProducts() {
  const products = await getProducts()
  return products.filter(p => p.active && p.stock <= p.minStock)
}

// ── Customers (vista del personal: nunca devuelve contraseñas) ─────────────
export async function getCustomers() {
  const list = await getAll(COLS.CUSTOMERS)
  return list.map(({ password, ...c }) => c)
}
export const addCustomer    = (data)  => addItem(COLS.CUSTOMERS, data)
export const updateCustomer = (id, d) => updateItem(COLS.CUSTOMERS, id, d)

// ── Cuentas de clientes de la tienda online ────────────────────────────────
const CUSTOMER_SESSION = 'glam_customer'
const normEmail = (e) => String(e || '').trim().toLowerCase()

export function getCustomerSession() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_SESSION)) } catch { return null }
}
function saveCustomerSession(c) {
  const { password, ...safe } = c
  localStorage.setItem(CUSTOMER_SESSION, JSON.stringify(safe))
  return safe
}
export function clearCustomerSession() { localStorage.removeItem(CUSTOMER_SESSION) }

export async function registerCustomer({ name, email, phone, address, password }) {
  const mail = normEmail(email)
  const existing = await whereEq(COLS.CUSTOMERS, 'email', mail)
  if (existing.some(c => c.password)) {
    throw new Error('Ya existe una cuenta con ese correo. Inicia sesión.')
  }
  // Si el personal ya tenía un cliente con ese correo se crea un registro nuevo:
  // sin verificar el correo no es seguro entregarle un historial ajeno.
  const c = await addCustomer({ name: name.trim(), email: mail, phone: phone.trim(), address: address.trim(), password, source: 'tienda' })
  return saveCustomerSession(c)
}

export async function loginCustomer(email, password) {
  const list = await whereEq(COLS.CUSTOMERS, 'email', normEmail(email))
  const c = list.find(x => x.password && x.password === password)
  return c ? saveCustomerSession(c) : null
}

export async function updateCustomerProfile(id, data) {
  await updateItem(COLS.CUSTOMERS, id, data)
  const current = getCustomerSession()
  if (current && current.id === id) saveCustomerSession({ ...current, ...data })
}

// ── Ventas / pedidos ───────────────────────────────────────────────────────
export const getSales    = ()      => getAll(COLS.SALES)
export const updateSale  = (id, d) => updateItem(COLS.SALES, id, d)

export class OrderError extends Error {
  constructor(message) { super(message); this.name = 'OrderError' }
}

/**
 * Registra una venta de forma atómica: valida stock, descuenta unidades y
 * guarda la venta en una sola transacción. Los precios y costos se toman
 * siempre de la base de datos, nunca de lo que envíe el navegador.
 */
export async function placeOrder(order) {
  // Unir líneas repetidas del mismo producto
  const qtyById = new Map()
  for (const it of order.items || []) {
    const q = Math.floor(Number(it.qty) || 0)
    if (!it.productId || q < 1) continue
    qtyById.set(it.productId, (qtyById.get(it.productId) || 0) + q)
  }
  if (qtyById.size === 0) throw new OrderError('Tu carrito está vacío.')

  const ids = [...qtyById.keys()]
  const saleRef = doc(collection(db, COLS.SALES))
  const { items: _ignored, ...base } = order

  const sale = await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(ids.map(id => tx.get(doc(db, COLS.PRODUCTS, id))))
    const lines = []
    snaps.forEach((snap, i) => {
      const qty = qtyById.get(ids[i])
      const p = snap.exists() ? snap.data() : null
      if (!p || p.active === false) throw new OrderError('Uno de los productos ya no está disponible.')
      if (p.stock < qty) {
        throw new OrderError(p.stock <= 0
          ? `"${p.name}" se agotó.`
          : `Solo quedan ${p.stock} unidad${p.stock === 1 ? '' : 'es'} de "${p.name}".`)
      }
      tx.update(snap.ref, { stock: p.stock - qty })
      lines.push({ productId: ids[i], name: p.name, qty, salePrice: p.salePrice, costPrice: p.costPrice || 0 })
    })
    const total = lines.reduce((a, l) => a + l.salePrice * l.qty, 0)
    const data = {
      ...base,
      items: lines,
      total: Math.round(total * 100) / 100,
      status: 'pendiente',
      paymentStatus: 'pendiente',
      createdAt: new Date().toISOString(),
    }
    tx.set(saleRef, data)
    return data
  })

  return { id: saleRef.id, ...sale }
}

// Venta registrada por el personal desde el panel
export const createSale = (saleData) => placeOrder({ ...saleData, source: saleData.source || 'panel' })

export async function getCustomerOrders(customerId) {
  const list = await whereEq(COLS.SALES, 'customerId', customerId)
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getPendingOnlineOrderCount() {
  const list = await whereEq(COLS.SALES, 'source', 'online')
  return list.filter(s => s.status === 'pendiente').length
}

// ── Settings ───────────────────────────────────────────────────────────────
export async function getSettings() {
  const s = await getOne(COLS.SETTINGS, 'config')
  return { ...DEFAULT_SETTINGS, ...(s || {}) }
}
export const saveSettings = (d) => {
  const { id, ...rest } = d
  return setItem(COLS.SETTINGS, 'config', rest)
}

// ── Utils ──────────────────────────────────────────────────────────────────
export function fmt(n) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n || 0)
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Código de país por defecto para números de 8 dígitos (El Salvador)
export const DEFAULT_COUNTRY_CODE = '503'
export function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.length === 8) d = DEFAULT_COUNTRY_CODE + d
  return d
}
export function waLink(phone, text) {
  const n = waNumber(phone)
  if (!n) return ''
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export const CHANNELS      = ['WhatsApp', 'Instagram', 'Facebook', 'Tienda física', 'Tienda online', 'Otra']
export const CHANNEL_ICONS = { WhatsApp: '💬', Instagram: '📸', Facebook: '👥', 'Tienda física': '🏪', 'Tienda online': '🛒', Otra: '🔗' }
export const ROLES         = { superadmin: 'SuperAdmin', admin: 'Administrador', vendedor: 'Vendedor' }

export const SALE_STATUS = {
  pendiente:  { label: 'Pendiente',  badge: 'badge-amber' },
  enviado:    { label: 'Enviado',    badge: 'badge-cyan'  },
  entregado:  { label: 'Entregado', badge: 'badge-green' },
  cancelado:  { label: 'Cancelado', badge: 'badge-red'   },
}

export const PAY_STATUS = {
  pendiente: { label: 'Sin pagar', badge: 'badge-red'   },
  pagado:    { label: 'Pagado',    badge: 'badge-green' },
  parcial:   { label: 'Parcial',   badge: 'badge-amber' },
}
