import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- CONFIGURACIÓN ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fM = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

function App() {
  const [view, setView] = useState('catalogo');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientes] = useState(["Juan Medina", "Juanita", "Juan Sebastián", "Juan David", "Daya", "Yara", "Isa"]);

  const fetchDatos = async () => {
    try {
      const { data: p } = await supabase.from('productos').select('*').order('nombre');
      const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: false });
      if (p) setProductos(p);
      if (v) setVentas(v);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDatos(); }, []);

  const registrarVenta = async (cliente, producto, cantidad = 1, fechaManual = null) => {
    if (!cliente) return alert("❌ Selecciona tu nombre");
    if (producto.stock < cantidad) return alert("❌ No hay suficiente stock");

    const totalVenta = producto.precio * cantidad;
    const nombreProducto = cantidad > 1 ? `${producto.nombre} (x${cantidad})` : producto.nombre;

    const fechaFinal = fechaManual 
      ? new Date(fechaManual).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
      : new Date().toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

    const { error: errorVenta } = await supabase.from('ventas').insert([
      { cliente, producto: nombreProducto, precio: totalVenta, fecha: fechaFinal, pagado: false }
    ]);

    const { error: errorStock } = await supabase.from('productos')
      .update({ stock: producto.stock - cantidad })
      .eq('id', producto.id);

    if (!errorVenta && !errorStock) {
      alert(`✅ Registrado: ${nombreProducto} para ${cliente}`);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-indigo-600 animate-pulse text-xl">🚀 SINCRONIZANDO TIENDA...</div>;

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
        {productos.map(p => <CardProducto key={p.id} producto={p} user={user} registrarVenta={registrarVenta} />)}
      </div>
    </div>
  )
}

function CardProducto({ producto: p, user, registrarVenta }) {
  const [cant, setCant] = useState(1);
  const handleComprar = () => {
    registrarVenta(user, p, cant);
    setCant(1);
  };

  return (
    <div className="bg-white p-2 rounded-[2rem] shadow-sm hover:shadow-xl transition-all border border-slate-50">
      <div className="bg-slate-50 rounded-[1.8rem] aspect-square flex items-center justify-center overflow-hidden">
        {p.imagen ? <img src={p.imagen} className="w-full h-full object-cover" /> : <span className="text-5xl">{p.emoji || "🍭"}</span>}
      </div>
      <div className="p-4 text-center">
        <h3 className="font-black text-slate-700 text-xs uppercase truncate">{p.nombre}</h3>
        <p className="text-indigo-600 font-black text-2xl my-2">{fM(p.precio)}</p>
        
        <div className="flex items-center justify-center gap-4 mb-4 bg-slate-50 rounded-xl p-1">
          <button onClick={() => setCant(Math.max(1, cant - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-indigo-600">-</button>
          <span className="font-black text-slate-700 w-4">{cant}</span>
          <button onClick={() => setCant(Math.min(p.stock, cant + 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-indigo-600">+</button>
        </div>

        <button onClick={handleComprar} disabled={p.stock <= 0 || cant > p.stock} className={`w-full py-4 rounded-2xl text-white font-black text-xs transition-all ${p.stock > 0 && cant <= p.stock ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95' : 'bg-slate-200 opacity-50 cursor-not-allowed'}`}>
          {p.stock <= 0 ? 'SOLD OUT' : `COMPRAR ${cant > 1 ? `x${cant}` : ''}`}
        </button>
        <p className="text-[10px] font-bold text-slate-300 uppercase mt-4 italic">Stock: {p.stock}</p>
      </div>
    </div>
  );
}

function VistaAdmin({ ventas, productos, clientes, registrarVenta, refresh }) {
  const [form, setForm] = useState({ id: null, nombre: '', precio: '', stock: '', emoji: '', imagen: '' });
  const [filtroNombre, setFiltroNombre] = useState("");
  const [manualUser, setManualUser] = useState("");
  const [manualProdId, setManualProdId] = useState("");
  const [manualCant, setManualCant] = useState(1);
  const [manualFecha, setManualFecha] = useState(new Date().toISOString().slice(0, 16));

  const ventasP = ventas.filter(v => !v.pagado);
  const totalF = ventasP.filter(v => v.cliente.includes(filtroNombre)).reduce((acc, v) => acc + v.precio, 0);

  const guardarProducto = async (e) => {
    e.preventDefault();
    const data = { ...form, precio: Number(form.precio), stock: Number(form.stock) };
    if (form.id) { await supabase.from('productos').update(data).eq('id', form.id); } 
    else { delete data.id; await supabase.from('productos').insert([data]); }
    setForm({ id: null, nombre: '', precio: '', stock: '', emoji: '', imagen: '' });
    refresh();
  };

  // NUEVA FUNCIÓN: Eliminar una deuda específica
  const eliminarVenta = async (id) => {
    if (confirm("¿Seguro que quieres borrar este registro de deuda?")) {
      const { error } = await supabase.from('ventas').delete().eq('id', id);
      if (!error) refresh();
      else alert("Error al borrar");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* SECCIÓN DEUDAS CON BOTÓN ELIMINAR */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
        <div className="flex justify-between items-center mb-8 gap-4">
          <h2 className="text-2xl font-black italic uppercase">Deudas Actuales</h2>
          <input placeholder="Buscar persona..." className="bg-slate-50 border-2 p-3 rounded-2xl w-48 md:w-80 outline-none" onChange={(e) => setFiltroNombre(e.target.value)} />
        </div>
        <div className="bg-slate-900 p-8 rounded-[2rem] text-white mb-6 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest text-indigo-300">Pendiente Total:</p>
            <p className="text-4xl font-black">{fM(filtroNombre ? totalF : ventasP.reduce((a,b)=>a+b.precio,0))}</p>
          </div>
          {filtroNombre && totalF > 0 && <button onClick={async () => { await supabase.from('ventas').update({ pagado: true }).eq('cliente', filtroNombre).eq('pagado', false); refresh(); }} className="bg-emerald-500 p-4 rounded-2xl font-black text-xs hover:bg-emerald-400 transition">PAGAR TODO ✅</button>}
        </div>
        <div className="max-h-80 overflow-y-auto pr-2">
          <table className="w-full text-left text-xs border-separate border-spacing-y-2">
            <thead>
              <tr className="text-slate-400 uppercase tracking-widest">
                <th className="pb-4 pl-2">Fecha</th>
                <th className="pb-4">Cliente</th>
                <th className="pb-4">Producto</th>
                <th className="pb-4 text-right">Valor</th>
                <th className="pb-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {ventasP.filter(v => v.cliente.includes(filtroNombre)).map(v => (
                <tr key={v.id} className="bg-slate-50 hover:bg-slate-100 transition-colors">
                  <td className="py-4 pl-4 rounded-l-2xl text-slate-400 font-medium">{v.fecha}</td>
                  <td className="py-4 font-bold">{v.cliente}</td>
                  <td className="py-4 text-slate-500">{v.producto}</td>
                  <td className="py-4 text-right font-black text-indigo-600">{fM(v.precio)}</td>
                  <td className="py-4 rounded-r-2xl text-center">
                    <button 
                      onClick={() => eliminarVenta(v.id)} 
                      className="bg-red-100 text-red-500 hover:bg-red-500 hover:text-white w-8 h-8 rounded-xl transition-all font-bold"
                      title="Eliminar Deuda"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VENTA MANUAL */}
      <div className="bg-indigo-50 p-8 rounded-[2.5rem] border-2 border-indigo-100">
        <h2 className="text-xl font-black mb-4 uppercase text-indigo-600">🛒 Venta Manual</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select className="p-4 rounded-2xl bg-white font-bold" value={manualUser} onChange={e => setManualUser(e.target.value)}><option value="">¿Quién?</option>{clientes.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <select className="p-4 rounded-2xl bg-white font-bold" value={manualProdId} onChange={e => setManualProdId(e.target.value)}><option value="">¿Snack?</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
          <input type="number" placeholder="Cant." className="p-4 rounded-2xl bg-white font-bold" value={manualCant} onChange={e => setManualCant(Number(e.target.value))} />
          <input type="datetime-local" className="p-4 rounded-2xl bg-white font-bold text-sm" value={manualFecha} onChange={e => setManualFecha(e.target.value)} />
          <button onClick={() => registrarVenta(manualUser, productos.find(p => p.id === Number(manualProdId)), manualCant, manualFecha)} className="bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition shadow-md shadow-indigo-200">REGISTRAR</button>
        </div>
      </div>

      {/* INVENTARIO */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
        <h2 className="text-xl font-black mb-6 uppercase text-indigo-600">{form.id ? '⚡ Editando Snack' : '➕ Nuevo Snack'}</h2>
        <form onSubmit={guardarProducto} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input placeholder="Nombre" className="bg-slate-50 p-4 rounded-2xl font-bold" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
          <input type="number" placeholder="Precio" className="bg-slate-50 p-4 rounded-2xl font-bold" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} />
          <input type="number" placeholder="Stock" className="bg-slate-50 p-4 rounded-2xl font-bold" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
          <input placeholder="Emoji" className="bg-slate-50 p-4 rounded-2xl text-center" value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})} />
          <input placeholder="URL Imagen" className="bg-slate-50 p-4 rounded-2xl lg:col-span-full" value={form.imagen} onChange={e => setForm({...form, imagen: e.target.value})} />
          <button className="bg-indigo-600 p-4 rounded-2xl font-black text-white col-span-full uppercase shadow-lg shadow-indigo-100">{form.id ? 'Actualizar' : 'Guardar en Inventario'}</button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100">
          {productos.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji || "🍬"}</span>
                <div><p className="font-bold leading-none">{p.nombre}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{p.stock} Uds Disponibles</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {setForm(p); window.scrollTo({top: 500, behavior:'smooth'})}} className="bg-white p-2 px-3 rounded-lg text-indigo-600 font-bold text-[10px] uppercase shadow-sm border border-indigo-50">Editar</button>
                <button onClick={async () => { if(confirm("¿Borrar producto del catálogo?")) { await supabase.from('productos').delete().eq('id', p.id); refresh(); } }} className="bg-red-50 p-2 px-3 rounded-lg text-red-400 font-bold text-[10px] uppercase">X</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App