import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- CONFIGURACIÓN ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- BASE DE DATOS DE USUARIOS Y PINS ---
const USUARIOS_DATA = {
  "Juan Medina": "4813",
  "Juanita": "3011",
  "Juan Sebastián": "3333",
  "Juan David": "0015",
  "Daya": "1997",
  "Yara": "2811",
  "Isa": "1206",
  "Sara": "5169"
};

const fM = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

function App() {
  const [view, setView] = useState('catalogo');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const clientes = Object.keys(USUARIOS_DATA);

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
    if (!cliente) return alert("❌ Selecciona tu nombre primero");
    
    // Si no es fecha manual (es decir, compra desde el catálogo), pedir PIN
    if (!fechaManual) {
      const pinIngresado = prompt(`🔐 Confirmar compra para ${cliente}. Ingresa tu PIN:`);
      if (pinIngresado !== USUARIOS_DATA[cliente]) {
        return alert("🚫 PIN incorrecto. Compra cancelada.");
      }
    }

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
      alert(`✅ ¡Listo! ${nombreProducto} registrado.`);
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
          <h1 className="font-black text-xl tracking-tighter italic uppercase">DÓNDE EL CALVO 👨🏼‍🦲</h1>
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
  
  // --- NUEVO: Estado para buscar en el inventario ---
  const [busquedaInventario, setBusquedaInventario] = useState("");
  
  const [manualUser, setManualUser] = useState("");
  const [manualProdId, setManualProdId] = useState("");
  const [manualCant, setManualCant] = useState(1);
  const [manualFecha, setManualFecha] = useState(new Date().toISOString().slice(0, 16));

  const ventasP = ventas.filter(v => !v.pagado);
  const totalF = ventasP.filter(v => v.cliente.includes(filtroNombre)).reduce((acc, v) => acc + v.precio, 0);

  // Filtrado de productos para el inventario
  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busquedaInventario.toLowerCase())
  );

const guardarProducto = async (e) => {
    e.preventDefault();
    
    // 1. Creamos un objeto limpio con solo lo que necesitamos
    const data = { 
      nombre: form.nombre, 
      precio: Number(form.precio), 
      stock: Number(form.stock), 
      emoji: form.emoji, 
      imagen: form.imagen 
    };

    if (form.id) { 
      // Si hay ID, actualizamos (SIN enviar el id o created_at dentro del body)
      const { error } = await supabase.from('productos').update(data).eq('id', form.id); 
      if (error) alert("Error al actualizar: " + error.message);
    } 
    else { 
      // Si no hay ID, insertamos nuevo registro
      const { error } = await supabase.from('productos').insert([data]); 
      if (error) alert("Error al crear: " + error.message);
    }

    // Resetear formulario y refrescar lista
    setForm({ id: null, nombre: '', precio: '', stock: '', emoji: '', imagen: '' });
    refresh();
  };

  const eliminarVenta = async (id) => {
    if (confirm("¿Seguro que quieres borrar este registro de deuda?")) {
      const { error } = await supabase.from('ventas').delete().eq('id', id);
      if (!error) refresh();
      else alert("Error al borrar");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. SECCIÓN DEUDAS (Se mantiene igual) */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
        <div className="flex justify-between items-center mb-8 gap-4">
          <h2 className="text-2xl font-black italic uppercase text-slate-800">Cuentas por Cobrar</h2>
          <input 
            placeholder="Filtrar por nombre..." 
            className="bg-slate-50 border-2 p-3 rounded-2xl w-48 md:w-80 outline-none focus:border-indigo-300 transition-all" 
            onChange={(e) => setFiltroNombre(e.target.value)} 
          />
        </div>
        <div className="bg-slate-900 p-8 rounded-[2rem] text-white mb-6 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest text-indigo-300">Total Pendiente:</p>
            <p className="text-4xl font-black">{fM(filtroNombre ? totalF : ventasP.reduce((a,b)=>a+b.precio,0))}</p>
          </div>
          {filtroNombre && totalF > 0 && (
            <button onClick={async () => { if(confirm(`¿Confirmas pago total de ${filtroNombre}?`)) { await supabase.from('ventas').update({ pagado: true }).eq('cliente', filtroNombre).eq('pagado', false); refresh(); } }} className="bg-emerald-500 p-4 rounded-2xl font-black text-xs hover:bg-emerald-400 transition">PAGO TOTAL ✅</button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto pr-2">
          <table className="w-full text-left text-xs border-separate border-spacing-y-2">
            <tbody>
              {ventasP.filter(v => v.cliente.includes(filtroNombre)).map(v => (
                <tr key={v.id} className="bg-slate-50 hover:bg-white transition-all group">
                  <td className="py-4 pl-4 rounded-l-2xl text-slate-400">{v.fecha}</td>
                  <td className="py-4 font-bold">{v.cliente}</td>
                  <td className="py-4 text-slate-500">{v.producto}</td>
                  <td className="py-4 text-right font-black text-indigo-600">{fM(v.precio)}</td>
                  <td className="py-4 rounded-r-2xl text-center">
                    <button onClick={() => eliminarVenta(v.id)} className="bg-red-50 text-red-400 hover:bg-red-500 hover:text-white w-8 h-8 rounded-xl transition-all font-bold">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. VENTA MANUAL (Se mantiene igual) */}
      <div className="bg-indigo-50 p-8 rounded-[2.5rem] border-2 border-indigo-100">
        <h2 className="text-xl font-black mb-4 uppercase text-indigo-600">🛒 Cargar Venta Directa</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select className="p-4 rounded-2xl bg-white font-bold" value={manualUser} onChange={e => setManualUser(e.target.value)}><option value="">¿Quién?</option>{clientes.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <select className="p-4 rounded-2xl bg-white font-bold" value={manualProdId} onChange={e => setManualProdId(e.target.value)}><option value="">¿Snack?</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
          <input type="number" placeholder="Cant." className="p-4 rounded-2xl bg-white font-bold" value={manualCant} onChange={e => setManualCant(Number(e.target.value))} />
          <input type="datetime-local" className="p-4 rounded-2xl bg-white font-bold text-sm" value={manualFecha} onChange={e => setManualFecha(e.target.value)} />
          <button onClick={() => {
            const prod = productos.find(p => p.id === Number(manualProdId));
            if (manualUser && prod) registrarVenta(manualUser, prod, manualCant, manualFecha);
          }} className="bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition shadow-md">CARGAR</button>
        </div>
      </div>

      {/* 3. FORMULARIO NUEVO SNACK Y BUSCADOR DE INVENTARIO */}
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

        <div className="mt-12 pt-8 border-t border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest">Snacks en Inventario</h3>
            
            {/* --- BUSCADOR DE INVENTARIO --- */}
            <div className="relative w-full md:w-72">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
              <input 
                type="text"
                placeholder="Buscar snack..."
                className="w-full bg-slate-50 border-2 border-slate-100 p-2 pl-10 rounded-xl text-sm outline-none focus:border-indigo-200 transition-all"
                value={busquedaInventario}
                onChange={(e) => setBusquedaInventario(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.emoji || "🍬"}</span>
                    <div>
                      <p className="font-bold leading-none text-slate-700">{p.nombre}</p>
                      <p className={`text-[10px] font-bold uppercase mt-1 ${p.stock === 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {p.stock} disponibles
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {setForm(p); window.scrollTo({top: 800, behavior:'smooth'})}} className="bg-white p-2 px-3 rounded-lg text-indigo-600 font-bold text-[10px] uppercase shadow-sm border border-indigo-50">Editar</button>
                    <button onClick={async () => { if(confirm("¿Eliminar este producto?")) { await supabase.from('productos').delete().eq('id', p.id); refresh(); } }} className="bg-red-50 p-2 px-3 rounded-lg text-red-400 font-bold text-[10px] uppercase">X</button>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full text-center py-10 text-slate-400 italic text-sm">No se encontraron snacks con ese nombre 🧐</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App