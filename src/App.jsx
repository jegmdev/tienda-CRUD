import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- CONFIGURACIÓN DE CONEXIÓN ---
// Usa los datos exactos de tu captura de pantalla de Supabase
const SUPABASE_URL = 'https://jmfpgbptmiaqqtdupywe.supabase.co'
const SUPABASE_KEY = 'sb_publishable_uGBko4es_nC4Oxcjeb5ltA_Bd3E5S9a' 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const ADMIN_PASSWORD = "1000757812"; 

const fM = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

function App() {
  const [view, setView] = useState('catalogo');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientes] = useState(["Juan Medina", "Juanita", "Juan Sebastián", "Juan David", "Daya", "Yara", "Isa"]);

  // Función para traer datos de la nube
  const fetchDatos = async () => {
    try {
      const { data: p } = await supabase.from('productos').select('*').order('nombre');
      const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: false });
      if (p) setProductos(p);
      if (v) setVentas(v);
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  const registrarVenta = async (cliente, producto, fechaManual = null) => {
    if (!cliente) return alert("❌ ¡Identifícate!");
    if (producto.stock <= 0) return alert("❌ Sin stock");

    const fechaFinal = fechaManual 
      ? new Date(fechaManual).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
      : new Date().toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

    // Guardar venta en Supabase
    const { error: errorVenta } = await supabase.from('ventas').insert([
      { cliente, producto: producto.nombre, precio: producto.precio, fecha: fechaFinal, pagado: false }
    ]);

    // Actualizar stock en Supabase
    const { error: errorStock } = await supabase.from('productos')
      .update({ stock: producto.stock - 1 })
      .eq('id', producto.id);

    if (!errorVenta && !errorStock) {
      alert(`✅ ¡Registrado para ${cliente}!`);
      fetchDatos();
    }
  };

  const manejarAccesoAdmin = () => {
    if (view === 'catalogo') {
      const pass = prompt("🔐 PIN de Admin:");
      if (pass === ADMIN_PASSWORD) { setIsAuthenticated(true); setView('admin'); }
      else { alert("🚫 Incorrecto"); }
    } else { setIsAuthenticated(false); setView('catalogo'); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-indigo-600 animate-pulse text-xl">
      🚀 SINCRONIZANDO TIENDA...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-indigo-600 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto max-w-5xl flex justify-between items-center">
          <h1 className="font-black text-xl tracking-tighter italic uppercase">DÓNDE EL CALVO 🚀</h1>
          <button onClick={manejarAccesoAdmin} className="bg-indigo-500 hover:bg-white hover:text-indigo-600 px-4 py-2 rounded-xl font-bold text-xs transition-all">
            {view === 'catalogo' ? 'ADMIN PANEL' : 'VOLVER AL CATÁLOGO'}
          </button>
        </div>
      </nav>

      <main className="container mx-auto p-4 max-w-5xl">
        {view === 'catalogo' ? (
          <VistaCatalogo productos={productos} clientes={clientes} registrarVenta={registrarVenta} ventas={ventas} />
        ) : (
          isAuthenticated && <VistaAdmin ventas={ventas} productos={productos} clientes={clientes} registrarVenta={registrarVenta} refresh={fetchDatos} />
        )}
      </main>
    </div>
  )
}

function VistaCatalogo({ productos, clientes, registrarVenta, ventas }) {
  const [user, setUser] = useState("");
  const deudaPersonal = ventas.filter(v => v.cliente === user && !v.pagado).reduce((acc, v) => acc + v.precio, 0);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 mt-4 flex flex-col items-center gap-4 text-center">
        <select className="w-full max-w-l bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-lg text-center" value={user} onChange={(e) => setUser(e.target.value)}>
          <option value="">¿Quién eres?</option>
          {clientes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {user && <div className="bg-indigo-50 text-indigo-600 px-6 py-2 rounded-full font-black text-sm uppercase">💰 Tu deuda: {fM(deudaPersonal)}</div>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {productos.map(p => (
          <div key={p.id} className="bg-white p-2 rounded-[2rem] shadow-sm hover:shadow-xl transition-all border border-slate-50">
            <div className="bg-slate-50 rounded-[1.8rem] aspect-square flex items-center justify-center overflow-hidden">
              {p.imagen ? <img src={p.imagen} className="w-full h-full object-cover" /> : <span className="text-5xl">{p.emoji || "🍭"}</span>}
            </div>
            <div className="p-4 text-center">
              <h3 className="font-black text-slate-700 text-xs uppercase truncate">{p.nombre}</h3>
              <p className="text-indigo-600 font-black text-2xl my-2">{fM(p.precio)}</p>
              <button onClick={() => registrarVenta(user, p)} disabled={p.stock <= 0} className={`w-full py-4 rounded-2xl text-white font-black text-xs ${p.stock > 0 ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95' : 'bg-slate-200 opacity-50'}`}>
                {p.stock > 0 ? 'AGREGAR A MI CUENTA' : 'SOLD OUT'}
              </button>
              <p className="text-[10px] font-bold text-slate-300 uppercase mt-4 italic">Stock: {p.stock}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VistaAdmin({ ventas, productos, clientes, registrarVenta, refresh }) {
  const [form, setForm] = useState({ id: null, nombre: '', precio: '', stock: '', emoji: '', imagen: '' });
  const [filtroNombre, setFiltroNombre] = useState("");
  const [manualUser, setManualUser] = useState("");
  const [manualProdId, setManualProdId] = useState("");
  const [manualFecha, setManualFecha] = useState(new Date().toISOString().slice(0, 16));

  const ventasP = ventas.filter(v => !v.pagado);
  const totalF = ventasP.filter(v => v.cliente.includes(filtroNombre)).reduce((acc, v) => acc + v.precio, 0);

  const guardarProducto = async (e) => {
    e.preventDefault();
    const data = { ...form, precio: Number(form.precio), stock: Number(form.stock) };
    if (form.id) {
      await supabase.from('productos').update(data).eq('id', form.id);
    } else {
      delete data.id;
      await supabase.from('productos').insert([data]);
    }
    setForm({ id: null, nombre: '', precio: '', stock: '', emoji: '', imagen: '' });
    refresh();
  };

  const pagarTodo = async () => {
    await supabase.from('ventas').update({ pagado: true }).eq('cliente', filtroNombre).eq('pagado', false);
    refresh();
  };

  return (
    <div className="space-y-8 pb-20">
      {/* DEUDAS */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
        <div className="flex justify-between items-center mb-8 gap-4">
          <h2 className="text-2xl font-black italic">DEUDAS</h2>
          <input placeholder="Buscar persona..." className="bg-slate-50 border-2 p-3 rounded-2xl w-48 md:w-80 outline-none" onChange={(e) => setFiltroNombre(e.target.value)} />
        </div>
        <div className="bg-slate-900 p-8 rounded-[2rem] text-white mb-6 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest text-indigo-300">Pendiente:</p>
            <p className="text-4xl font-black">{fM(filtroNombre ? totalF : ventasP.reduce((a,b)=>a+b.precio,0))}</p>
          </div>
          {filtroNombre && totalF > 0 && <button onClick={pagarTodo} className="bg-emerald-500 p-4 rounded-2xl font-black text-xs hover:bg-emerald-400 transition">PAGAR TODO ✅</button>}
        </div>
        <div className="max-h-60 overflow-y-auto pr-2">
          <table className="w-full text-left text-xs">
            <tbody>
              {ventasP.filter(v => v.cliente.includes(filtroNombre)).map(v => (
                <tr key={v.id} className="border-b border-slate-50">
                  <td className="py-3 text-slate-400 font-medium">{v.fecha}</td>
                  <td className="py-3 font-bold">{v.cliente}</td>
                  <td className="py-3 text-slate-500">{v.producto}</td>
                  <td className="py-3 text-right font-black text-indigo-600">{fM(v.precio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VENTA MANUAL */}
      <div className="bg-indigo-50 p-8 rounded-[2.5rem] border-2 border-indigo-100">
        <h2 className="text-xl font-black mb-4 uppercase text-indigo-600">🛒 Venta Manual</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className="p-4 rounded-2xl bg-white font-bold" value={manualUser} onChange={e => setManualUser(e.target.value)}>
            <option value="">¿Quién?</option>
            {clientes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="p-4 rounded-2xl bg-white font-bold" value={manualProdId} onChange={e => setManualProdId(e.target.value)}>
            <option value="">¿Snack?</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input type="datetime-local" className="p-4 rounded-2xl bg-white font-bold text-sm" value={manualFecha} onChange={e => setManualFecha(e.target.value)} />
          <button onClick={() => registrarVenta(manualUser, productos.find(p => p.id === Number(manualProdId)), manualFecha)} className="bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition">REGISTRAR</button>
        </div>
      </div>

      {/* INVENTARIO */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
        <h2 className="text-xl font-black mb-6 uppercase text-indigo-600">{form.id ? '⚡ Editando' : '➕ Nuevo Snack'}</h2>
        <form onSubmit={guardarProducto} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input placeholder="Nombre" className="bg-slate-50 p-4 rounded-2xl font-bold" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
          <input type="number" placeholder="Precio" className="bg-slate-50 p-4 rounded-2xl font-bold" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} />
          <input type="number" placeholder="Stock" className="bg-slate-50 p-4 rounded-2xl font-bold" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
          <input placeholder="Emoji" className="bg-slate-50 p-4 rounded-2xl text-center" value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})} />
          <input placeholder="URL Imagen" className="bg-slate-50 p-4 rounded-2xl lg:col-span-full" value={form.imagen} onChange={e => setForm({...form, imagen: e.target.value})} />
          <button className="bg-indigo-600 p-4 rounded-2xl font-black text-white col-span-full uppercase">{form.id ? 'Actualizar' : 'Guardar'}</button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t">
          {productos.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji || "🍬"}</span>
                <div><p className="font-bold leading-none">{p.nombre}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{p.stock} Uds</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {setForm(p); window.scrollTo({top: 500, behavior:'smooth'})}} className="bg-indigo-50 p-2 px-3 rounded-lg text-indigo-600 font-bold text-[10px] uppercase">Editar</button>
                <button onClick={async () => { if(confirm("¿Borrar?")) { await supabase.from('productos').delete().eq('id', p.id); refresh(); } }} className="bg-red-50 p-2 px-3 rounded-lg text-red-400 font-bold text-[10px] uppercase">X</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App