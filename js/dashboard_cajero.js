// ========================================
//  PANEL CAJERO PRO - JAVASCRIPT COMPLETO
//  CON IMÁGENES E IMPRESIÓN DE FACTURA
// ========================================

// ========== INICIALIZAR EMAILJS ==========
emailjs.init('service_dsmpf0q');

// ========== VARIABLES GLOBALES ==========
function esperarFirebase() {
  return new Promise((resolve) => {
    const checkFirebase = setInterval(() => {
      if (window.FB && window.FB.db) {
        clearInterval(checkFirebase);
        console.log("✅ Firebase detectado y listo");
        resolve();
      }
    }, 100);
    setTimeout(() => {
      clearInterval(checkFirebase);
      resolve();
    }, 10000);
  });
}

if (typeof Auth === 'undefined') {
  window.location.href = 'login.html';
} else {
  Auth.requireAuth();
}

const sesion = Auth.getSesion();
let productos = [];
let ventas = [];
let devoluciones = [];
let categorias = [];
let carrito = [];
let cajaAbierta = false;
let descuentoGlobal = 0;
let metodoPagoSeleccionado = 'efectivo';
let unsubscribeProductos = null;
let unsubscribeVentas = null;
let unsubscribeDevoluciones = null;
let categoriaActual = '';
let clienteActual = { nombre: 'Mostrador', telefono: '' };
let notaVenta = '';
let ventasPendientes = JSON.parse(localStorage.getItem('ventasPendientes')) || [];
let ventaDevolucion = null;

document.getElementById('nombreNegocio').textContent = sesion.nombre || 'Mi Negocio';
document.getElementById('nombreUsuario').textContent = sesion.nombre || 'Cajero';

// ========== NAVEGACIÓN ==========
document.querySelectorAll('.sidebar-menu a[data-section]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = link.dataset.section;
    
    document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + section).classList.add('active');
    
    document.getElementById('currentSection').textContent = link.textContent.trim();
    
    if (section === 'historial') renderHistorial();
    if (section === 'caja') actualizarResumenCaja();
    if (section === 'miturno') cargarMiTurno();
    if (section === 'pendientes') renderVentasPendientes();
  });
});

document.getElementById('btnCerrarSesion').addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('¿Cerrar sesión?')) {
    if (unsubscribeProductos) unsubscribeProductos();
    if (unsubscribeVentas) unsubscribeVentas();
    if (unsubscribeDevoluciones) unsubscribeDevoluciones();
    Auth.logout();
  }
});

// ========== MENSAJES ==========
function mostrarMensaje(mensaje, tipo = 'success') {
  const el = document.getElementById(tipo === 'success' ? 'successMsg' : 'errorMsg');
  el.textContent = mensaje;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}
window.cerrarModal = cerrarModal;

function reproducirBeep() {
  if (!document.getElementById('sonidosActivados').checked) return;
  const audio = document.getElementById('beepSound');
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// ========== CAJA ==========
async function verificarCaja() {
  try {
    const negocio = await Storage.getNegocioById(sesion.id);
    cajaAbierta = negocio?.caja?.abierta || false;
    
    const estadoEl = document.getElementById('estadoCaja');
    const estadoTexto = document.getElementById('cajaEstadoTexto');
    const saldoInicial = document.getElementById('cajaSaldoInicial');
    
    if (cajaAbierta) {
      estadoEl.textContent = 'Caja Abierta';
      estadoEl.className = 'badge badge-success';
      estadoTexto.textContent = '✅ Caja Abierta';
      saldoInicial.textContent = `Saldo inicial: ${formatMoney(negocio.caja.saldoInicial || 0)}`;
      document.getElementById('btnAbrirCaja').disabled = true;
      document.getElementById('btnCerrarCaja').disabled = false;
    } else {
      estadoEl.textContent = 'Caja Cerrada';
      estadoEl.className = 'badge badge-danger';
      estadoTexto.textContent = '⚠️ Caja Cerrada';
      saldoInicial.textContent = 'Debes abrir la caja para operar';
      document.getElementById('btnAbrirCaja').disabled = false;
      document.getElementById('btnCerrarCaja').disabled = true;
    }
  } catch (err) {
    console.error('Error al verificar caja:', err);
  }
}

document.getElementById('btnAbrirCaja').addEventListener('click', async () => {
  if (cajaAbierta) {
    mostrarMensaje('❌ La caja ya está abierta', 'error');
    return;
  }
  
  const monto = prompt('Ingresa el saldo inicial de caja:');
  if (!monto || isNaN(monto) || parseFloat(monto) < 0) {
    mostrarMensaje('❌ Monto inválido', 'error');
    return;
  }
  
  try {
    await Storage.actualizarCaja({
      abierta: true,
      saldoInicial: parseFloat(monto),
      movimientos: [{
        tipo: 'apertura',
        monto: parseFloat(monto),
        timestamp: Date.now(),
        usuario: sesion.nombre
      }]
    });
    mostrarMensaje('✅ Caja abierta correctamente');
    verificarCaja();
  } catch (err) {
    mostrarMensaje('❌ Error al abrir caja: ' + err.message, 'error');
  }
});

async function cargarLogoNegocio() {
  try {
    const negocio = await Storage.getNegocioById(sesion.id);
    document.getElementById('nombreNegocio').textContent = negocio.nombre || 'Mi Negocio';
    
    if (negocio.logo) {
      const logoImg = document.getElementById('logoNegocioTopbar');
      if (logoImg) {
        logoImg.src = negocio.logo;
        logoImg.style.display = 'block';
        console.log('✅ Logo cargado en topbar');
      }
    }
  } catch (error) {
    console.error('❌ Error al cargar logo:', error);
  }
}
window.cargarLogoNegocio = cargarLogoNegocio;

document.getElementById('btnCerrarCaja').addEventListener('click', async () => {
  if (!cajaAbierta) {
    mostrarMensaje('❌ La caja ya está cerrada', 'error');
    return;
  }
  
  if (carrito.length > 0) {
    if (!confirm('Hay una venta en proceso. ¿Deseas cancelarla y cerrar la caja?')) {
      return;
    }
    carrito = [];
    renderCarrito();
  }
  
  if (!confirm('¿Cerrar la caja? No podrás registrar más ventas hasta que la vuelvas a abrir.')) {
    return;
  }
  
  try {
    const negocio = await Storage.getNegocioById(sesion.id);
    const movimientos = negocio.caja?.movimientos || [];
    movimientos.push({
      tipo: 'cierre',
      timestamp: Date.now(),
      usuario: sesion.nombre
    });
    
    await Storage.actualizarCaja({
      abierta: false,
      saldoInicial: negocio.caja?.saldoInicial || 0,
      movimientos
    });
    
    mostrarMensaje('✅ Caja cerrada correctamente');
    verificarCaja();
  } catch (err) {
    mostrarMensaje('❌ Error al cerrar caja: ' + err.message, 'error');
  }
});

async function actualizarResumenCaja() {
  const hoy = new Date().setHours(0,0,0,0);
  const ventasHoy = ventas.filter(v => v.timestamp >= hoy);

  // Calcular productos vendidos PRIMERO
  const productosVendidos = ventasHoy.reduce((sum, v) => {
    return sum + (v.items?.reduce((s, i) => s + i.cantidad, 0) || 0);
  }, 0);

  // "Ventas Hoy" ahora muestra el total de productos vendidos
  document.getElementById('ventasDelDia').textContent = productosVendidos;

  const totalVendido = ventasHoy.reduce((sum, v) => sum + v.total, 0);
  document.getElementById('totalVendido').textContent = formatMoney(totalVendido);

  document.getElementById('productosVendidos').textContent = productosVendidos;
}

// ========== PRODUCTOS CON IMÁGENES ==========
function iniciarListenerProductos() {
  if (!Storage || !Storage.escucharProductos) return;
  
  console.log('🔄 Iniciando listener de productos...');
  unsubscribeProductos = Storage.escucharProductos((productosActualizados) => {
    console.log('📦 Productos actualizados:', productosActualizados.length);
    productos = productosActualizados;
    renderProductos();
    actualizarMiniStats();
  });
}

function iniciarListenerDevoluciones() {
  if (!Storage || !Storage.escucharDevoluciones) return;
  
  console.log('🔄 Iniciando listener de devoluciones...');
  unsubscribeDevoluciones = Storage.escucharDevoluciones((devolucionesActualizadas) => {
    console.log('🔄 Devoluciones actualizadas:', devolucionesActualizadas.length);
    devoluciones = devolucionesActualizadas;
  });
}

function renderProductos() {
  const container = document.getElementById('productosGrid');
  container.innerHTML = '';
  
  let productosFiltrados = productos.filter(p => p.cantidad > 0);
  
  if (categoriaActual) {
    productosFiltrados = productosFiltrados.filter(p => p.categoria?.toUpperCase() === categoriaActual);
  }
  
  if (productosFiltrados.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No hay productos disponibles</p></div>';
    return;
  }
  
  productosFiltrados.forEach(p => {
    const div = document.createElement('div');
    div.className = 'producto-card';
    if (p.cantidad <= 0) div.classList.add('sin-stock');
    div.onclick = () => agregarAlCarrito(p.id);
    
    const imagenHTML = p.imagen 
      ? `<img src="${p.imagen}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; background: #f5f5f5;" alt="${p.nombre}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div style="width: 100%; height: 80px; display: none; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 8px; margin-bottom: 10px; font-size: 32px;">📦</div>`
      : `<div style="width: 100%; height: 80px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 8px; margin-bottom: 10px; font-size: 32px;">📦</div>`;
    
    div.innerHTML = `
      ${imagenHTML}
      <div class="producto-nombre">${p.nombre}</div>
      <div class="producto-precio">${formatMoney(p.precioVenta)}</div>
      <div class="producto-stock">Stock: ${p.cantidad}</div>
    `;
    
    container.appendChild(div);
  });
}

async function cargarCategorias() {
  try {
    const negocio = await Storage.getNegocioById(sesion.id);
    categorias = negocio?.categorias || [];
    
    const container = document.getElementById('categoriasFilter');
    container.innerHTML = '<button class="cat-btn active" data-categoria="">Todos</button>';
    
    categorias.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn';
      btn.dataset.categoria = cat;
      btn.textContent = cat;
      btn.onclick = () => filtrarPorCategoria(cat);
      container.appendChild(btn);
    });
  } catch (err) {
    console.error('Error al cargar categorías:', err);
  }
}

function filtrarPorCategoria(categoria) {
  categoriaActual = categoria;
  document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
  
  if (btn.dataset.categoria === categoria) {
    btn.classList.add('active');
  }
  
  renderProductos();
}

document.getElementById('buscarCodigo').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const codigo = e.target.value.trim();
    if (!codigo) return;
    
    const producto = productos.find(p => p.codigo === codigo);
    if (producto) {
      agregarAlCarrito(producto.id);
      e.target.value = '';
      e.target.focus();
    } else {
      mostrarMensaje('❌ Producto no encontrado', 'error');
    }
  }
});

document.getElementById('buscarNombre').addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase();
  const container = document.getElementById('productosGrid');
  
  if (!texto) {
    renderProductos();
    return;
  }
  
  const filtrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(texto) && p.cantidad > 0
  );
  
  container.innerHTML = '';
  
  if (filtrados.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No se encontraron productos</p></div>';
    return;
  }
  
  filtrados.forEach(p => {
    const div = document.createElement('div');
    div.className = 'producto-card';
    div.onclick = () => agregarAlCarrito(p.id);
    
    const imagenHTML = p.imagen 
      ? `<img src="${p.imagen}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; background: #f5f5f5;" alt="${p.nombre}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div style="width: 100%; height: 80px; display: none; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 8px; margin-bottom: 10px; font-size: 32px;">📦</div>`
      : `<div style="width: 100%; height: 80px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 8px; margin-bottom: 10px; font-size: 32px;">📦</div>`;
    
    div.innerHTML = `
      ${imagenHTML}
      <div class="producto-nombre">${p.nombre}</div>
      <div class="producto-precio">${formatMoney(p.precioVenta)}</div>
      <div class="producto-stock">Stock: ${p.cantidad}</div>
    `;
    
    container.appendChild(div);
  });
});

// ========== CARRITO ==========
function agregarAlCarrito(id) {
  if (!cajaAbierta) {
    mostrarMensaje('⚠️ Debes abrir la caja primero', 'error');
    return;
  }
  
  const producto = productos.find(p => p.id === id);
  if (!producto || producto.cantidad <= 0) {
    mostrarMensaje('❌ Producto sin stock', 'error');
    return;
  }
  
  const itemExistente = carrito.find(i => i.id === id);
  
  if (itemExistente) {
    if (itemExistente.cantidad < producto.cantidad) {
      itemExistente.cantidad++;
    } else {
      mostrarMensaje('⚠️ No hay más stock disponible', 'error');
      return;
    }
  } else {
    carrito.push({
      id: producto.id,
      codigo: producto.codigo || 'N/A',
      nombre: producto.nombre,
      precioVenta: producto.precioVenta,
      precioCompra: producto.precioCompra || 0,
      cantidad: 1,
      imagen: producto.imagen
    });
  }
  
  reproducirBeep();
  renderCarrito();
}
window.agregarAlCarrito = agregarAlCarrito;

function renderCarrito() {
  const container = document.getElementById('carritoItems');
  
  if (carrito.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px;">🛒</div>
        <p>Carrito vacío</p>
      </div>
    `;
    document.getElementById('totalVenta').textContent = '$ 0';
    document.getElementById('subtotalInfo').textContent = '';
    return;
  }
  
  container.innerHTML = '';
  let subtotal = 0;
  
  carrito.forEach((item, index) => {
    const itemTotal = item.precioVenta * item.cantidad;
    subtotal += itemTotal;
    
    const div = document.createElement('div');
    div.className = 'carrito-item';
    
    const imagenHTML = item.imagen 
      ? `<img src="${item.imagen}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px; margin-right: 10px; background: #f5f5f5; border: 2px solid #ecf0f1;" alt="${item.nombre}" onerror="this.style.display='none';">`
      : '';
    
    div.innerHTML = `
      <div style="display: flex; align-items: center; flex: 1;">
        ${imagenHTML}
        <div>
          <div style="font-weight: 600; font-size: 14px;">${item.nombre}</div>
          <div style="font-size: 12px; color: #7f8c8d;">${formatMoney(item.precioVenta)} c/u</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="carrito-cantidad">
          <button onclick="cambiarCantidad(${index}, -1)">-</button>
          <span style="min-width: 25px; text-align: center; font-weight: bold;">${item.cantidad}</span>
          <button onclick="cambiarCantidad(${index}, 1)">+</button>
        </div>
        <div style="text-align: right; min-width: 90px;">
          <strong style="font-size: 15px;">${formatMoney(itemTotal)}</strong>
        </div>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 16px; line-height: 1;" onclick="eliminarDelCarrito(${index})">🗑️</button>
      </div>
    `;
    
    container.appendChild(div);
  });
  
  let total = subtotal;
  
  if (descuentoGlobal > 0) {
    const descuentoMonto = subtotal * (descuentoGlobal / 100);
    total = subtotal - descuentoMonto;
    document.getElementById('subtotalInfo').textContent = `Subtotal: ${formatMoney(subtotal)} | Descuento: -${formatMoney(descuentoMonto)}`;
  } else {
    document.getElementById('subtotalInfo').textContent = '';
  }
  
  document.getElementById('totalVenta').textContent = formatMoney(total);
}

function cambiarCantidad(index, delta) {
  const item = carrito[index];
  const producto = productos.find(p => p.id === item.id);
  const nuevaCantidad = item.cantidad + delta;
  
  if (nuevaCantidad <= 0) {
    eliminarDelCarrito(index);
    return;
  }
  
  if (nuevaCantidad > producto.cantidad) {
    mostrarMensaje('⚠️ No hay más stock disponible', 'error');
    return;
  }
  
  item.cantidad = nuevaCantidad;
  renderCarrito();
}
window.cambiarCantidad = cambiarCantidad;

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  renderCarrito();
}
window.eliminarDelCarrito = eliminarDelCarrito;

// ========== CLIENTE ==========
function editarCliente() {
  document.getElementById('clienteNombre').value = clienteActual.nombre;
  document.getElementById('clienteTelefono').value = clienteActual.telefono;
  document.getElementById('modalCliente').classList.add('show');
  document.getElementById('clienteNombre').focus();
}
window.editarCliente = editarCliente;

document.getElementById('btnGuardarCliente').addEventListener('click', () => {
  const nombre = document.getElementById('clienteNombre').value.trim();
  const telefono = document.getElementById('clienteTelefono').value.trim();
  
  if (!nombre) {
    mostrarMensaje('❌ Ingresa el nombre del cliente', 'error');
    return;
  }
  
  clienteActual = { nombre, telefono };
  document.getElementById('clienteInfo').textContent = nombre;
  cerrarModal('modalCliente');
  mostrarMensaje('✅ Cliente actualizado');
});

// ========== NOTA ==========
function agregarNota() {
  document.getElementById('notaVenta').value = notaVenta || '';
  document.getElementById('modalNota').classList.add('show');
}
window.agregarNota = agregarNota;

function guardarNota() {
  notaVenta = document.getElementById('notaVenta').value.trim();
  cerrarModal('modalNota');
  if (notaVenta) {
    mostrarMensaje('✅ Nota agregada');
  }
}
window.guardarNota = guardarNota;

// ========== DESCUENTO ==========
document.getElementById('btnAplicarDescuento').addEventListener('click', () => {
  if (carrito.length === 0) {
    mostrarMensaje('⚠️ El carrito está vacío', 'error');
    return;
  }
  
  const descuento = prompt('Descuento en % (0-100):');
  if (!descuento || isNaN(descuento)) return;
  
  const valor = parseFloat(descuento);
  if (valor < 0 || valor > 100) {
    mostrarMensaje('❌ Descuento inválido (0-100)', 'error');
    return;
  }
  
  descuentoGlobal = valor;
  
  if (valor > 0) {
    document.getElementById('descuentoInfo').style.display = 'flex';
    document.getElementById('descuentoTexto').textContent = `${valor}%`;
  } else {
    document.getElementById('descuentoInfo').style.display = 'none';
  }
  
  renderCarrito();
  mostrarMensaje(`✅ Descuento del ${valor}% aplicado`);
});

function quitarDescuento() {
  descuentoGlobal = 0;
  document.getElementById('descuentoInfo').style.display = 'none';
  renderCarrito();
  mostrarMensaje('✅ Descuento eliminado');
}
window.quitarDescuento = quitarDescuento;

// ========== CANCELAR VENTA ==========
document.getElementById('btnCancelarVenta').addEventListener('click', () => {
  if (carrito.length === 0) {
    mostrarMensaje('⚠️ El carrito ya está vacío', 'error');
    return;
  }
  
  if (!confirm('¿Cancelar la venta actual? Se perderán todos los productos del carrito.')) {
    return;
  }
  
  carrito = [];
  descuentoGlobal = 0;
  clienteActual = { nombre: 'Mostrador', telefono: '' };
  notaVenta = '';
  document.getElementById('clienteInfo').textContent = 'Mostrador';
  document.getElementById('descuentoInfo').style.display = 'none';
  renderCarrito();
  mostrarMensaje('✅ Venta cancelada');
});

// ========== VENTAS PENDIENTES ==========
function guardarVentaPendiente() {
  if (carrito.length === 0) {
    mostrarMensaje('⚠️ El carrito está vacío', 'error');
    return;
  }
  
  const ventaPendiente = {
    id: `PEND${Date.now()}`,
    timestamp: Date.now(),
    carrito: [...carrito],
    cliente: {...clienteActual},
    descuento: descuentoGlobal,
    nota: notaVenta
  };
  
  ventasPendientes.push(ventaPendiente);
  localStorage.setItem('ventasPendientes', JSON.stringify(ventasPendientes));
  
  carrito = [];
  descuentoGlobal = 0;
  clienteActual = { nombre: 'Mostrador', telefono: '' };
  notaVenta = '';
  document.getElementById('clienteInfo').textContent = 'Mostrador';
  document.getElementById('descuentoInfo').style.display = 'none';
  renderCarrito();
  actualizarMiniStats();
  
  mostrarMensaje('✅ Venta guardada. Puedes recuperarla desde "Ventas Pendientes"');
}
window.guardarVentaPendiente = guardarVentaPendiente;

function renderVentasPendientes() {
  const container = document.getElementById('ventasPendientesLista');
  container.innerHTML = '';
  
  if (ventasPendientes.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No hay ventas pendientes</p></div>';
    return;
  }
  
  ventasPendientes.forEach((venta, index) => {
    const total = venta.carrito.reduce((sum, item) => sum + (item.precioVenta * item.cantidad), 0);
    const totalConDescuento = total * (1 - venta.descuento / 100);
    
    const div = document.createElement('div');
    div.className = 'venta-pendiente-item';
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>${venta.cliente.nombre}</strong>
          <div style="font-size: 12px; color: #7f8c8d;">
            ${venta.carrito.length} productos | ${formatDate(venta.timestamp)}
          </div>
          ${venta.nota ? `<div style="font-size: 12px; color: #f39c12;">📝 ${venta.nota}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: bold; color: #16a085;">${formatMoney(totalConDescuento)}</div>
          <div style="display: flex; gap: 5px; margin-top: 5px;">
            <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px;" onclick="recuperarVentaPendiente(${index})">✅ Recuperar</button>
            <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="eliminarVentaPendiente(${index})">🗑️</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

function recuperarVentaPendiente(index) {
  if (carrito.length > 0) {
    if (!confirm('Ya hay productos en el carrito. ¿Reemplazar con la venta pendiente?')) {
      return;
    }
  }
  
  const venta = ventasPendientes[index];
  carrito = [...venta.carrito];
  clienteActual = {...venta.cliente};
  descuentoGlobal = venta.descuento;
  notaVenta = venta.nota || '';
  
  document.getElementById('clienteInfo').textContent = clienteActual.nombre;
  
  if (descuentoGlobal > 0) {
    document.getElementById('descuentoInfo').style.display = 'flex';
    document.getElementById('descuentoTexto').textContent = `${descuentoGlobal}%`;
  }
  
  ventasPendientes.splice(index, 1);
  localStorage.setItem('ventasPendientes', JSON.stringify(ventasPendientes));
  
  renderCarrito();
  actualizarMiniStats();
  
  document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
  document.querySelector('[data-section="venta"]').classList.add('active');
  
  document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
  document.getElementById('section-venta').classList.add('active');
  
  document.getElementById('currentSection').textContent = 'Nueva Venta';
  
  mostrarMensaje('✅ Venta recuperada');
}
window.recuperarVentaPendiente = recuperarVentaPendiente;

function eliminarVentaPendiente(index) {
  if (!confirm('¿Eliminar esta venta pendiente?')) return;
  
  ventasPendientes.splice(index, 1);
  localStorage.setItem('ventasPendientes', JSON.stringify(ventasPendientes));
  renderVentasPendientes();
  actualizarMiniStats();
  
  mostrarMensaje('✅ Venta pendiente eliminada');
}
window.eliminarVentaPendiente = eliminarVentaPendiente;

// ========== CONFIRMAR VENTA ==========
document.getElementById('btnConfirmarVenta').addEventListener('click', () => {
  if (!cajaAbierta) {
    mostrarMensaje('⚠️ Debes abrir la caja primero', 'error');
    return;
  }
  
  if (carrito.length === 0) {
    mostrarMensaje('⚠️ El carrito está vacío', 'error');
    return;
  }
  
  const subtotal = carrito.reduce((sum, item) => sum + (item.precioVenta * item.cantidad), 0);
  const descuentoMonto = subtotal * (descuentoGlobal / 100);
  const total = subtotal - descuentoMonto;
  
  document.getElementById('totalAPagar').textContent = formatMoney(total);
  document.getElementById('montoRecibido').value = '';
  document.getElementById('cambioTexto').textContent = '$ 0';
  
  document.getElementById('modalPago').classList.add('show');
  document.getElementById('montoRecibido').focus();
});

// ========== MÉTODO DE PAGO ==========
document.querySelectorAll('.metodo-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    metodoPagoSeleccionado = btn.dataset.metodo;
    document.getElementById('efectivoSection').style.display = metodoPagoSeleccionado === 'efectivo' ? 'block' : 'none';
  });
});

document.getElementById('montoRecibido').addEventListener('input', (e) => {
  const subtotal = carrito.reduce((sum, item) => sum + (item.precioVenta * item.cantidad), 0);
  const descuentoMonto = subtotal * (descuentoGlobal / 100);
  const total = subtotal - descuentoMonto;
  
  const recibido = parseFloat(e.target.value) || 0;
  const cambio = recibido - total;
  
  document.getElementById('cambioTexto').textContent = formatMoney(Math.max(0, cambio));
  document.getElementById('cambioTexto').style.color = cambio >= 0 ? '#27ae60' : '#e74c3c';
});

// ========== IMPRESIÓN DE FACTURA ==========
function imprimirFactura(ventaData) {
  const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
  const fechaEmision = new Date(ventaData.timestamp || Date.now());
  const fechaFormateada = fechaEmision.toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  
  const productosHTML = ventaData.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.codigo || 'N/A'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.nombre}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.cantidad}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatMoney(item.precioVenta)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatMoney(item.precioVenta * item.cantidad)}</td>
    </tr>
  `).join('');
  
  const descuentoMonto = (ventaData.subtotal - ventaData.total) || (ventaData.descuento > 0 ? ventaData.total * (ventaData.descuento / 100) : 0);
  const baseGravada = ventaData.total * 0.84;
  const igv = ventaData.total * 0.16;
  
  const qrData = `${sesion.nombre}|${ventaData.id}|${ventaData.total}`;
  const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
  
  const facturaHTML = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Factura Electrónica</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; padding: 20px; max-width: 800px; margin: 0 auto; background: white; }
        .factura-container { border: 2px solid #000; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
        .logo { font-size: 48px; font-weight: bold; margin-bottom: 10px; }
        .empresa-info { font-size: 12px; line-height: 1.6; }
        .titulo-documento { background: #000; color: #fff; padding: 10px; text-align: center; font-weight: bold; margin: 15px 0; font-size: 14px; }
        .info-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
        .productos-table { width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 11px; }
        .productos-table th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #000; font-weight: bold; }
        .totales { float: right; width: 300px; margin-top: 20px; font-size: 11px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ddd; }
        .total-final { font-size: 16px; font-weight: bold; padding: 10px; background: #f5f5f5; margin-top: 10px; }
        .qr-section { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px dashed #000; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
        @media print { body { padding: 0; } .factura-container { border: none; } }
      </style>
    </head>
    <body>
      <div class="factura-container">
        <div class="header">
          <div class="logo">🏪 LP</div>
          <div class="empresa-info">
            <strong>${sesion.nombre || 'TIENDA PRUEBA'}</strong><br>
            JR. TIENDA PRUEBA<br>
            LIMA-LIMA-BARRANCO<br>
            RUC: 20453297899
          </div>
        </div>
        
        <div class="titulo-documento">
          BOLETA DE VENTA ELECTRÓNICA<br>
          SERIE B001 - CORRELATIVO: ${ventaData.id || 'N/A'}
        </div>
        
        <div class="info-row"><span><strong>FECHA EMISIÓN:</strong> ${fechaFormateada}</span></div>
        <div class="info-row"><span><strong>CAJERO:</strong> ${ventaData.usuario || sesion.nombre}</span></div>
        <div class="info-row">
          <span><strong>CLIENTE:</strong> ${ventaData.cliente?.nombre || 'MOSTRADOR'}</span>
          <span><strong>NRO. DOC:</strong> ${ventaData.cliente?.telefono || 'N/A'}</span>
        </div>
        ${ventaData.nota ? `<div class="info-row"><span><strong>NOTA:</strong> ${ventaData.nota}</span></div>` : ''}
        
        <table class="productos-table">
          <thead><tr><th>CÓDIGO</th><th>DESCRIPCIÓN</th><th style="text-align: center;">CANT</th><th style="text-align: right;">P. UNIT</th><th style="text-align: right;">IMP.</th></tr></thead>
          <tbody>${productosHTML}</tbody>
        </table>
        
        <div class="totales">
          <div class="total-row"><span>OP. GRAVADA</span><strong>${formatMoney(baseGravada)}</strong></div>
          <div class="total-row"><span>OP. INAFECTA</span><strong>$ 0.00</strong></div>
          <div class="total-row"><span>OP. EXONERADA</span><strong>$ 0.00</strong></div>
          ${descuentoMonto > 0 ? `<div class="total-row"><span>DESCUENTO</span><strong>-${formatMoney(descuentoMonto)}</strong></div>` : ''}
          <div class="total-row"><span>IGV (16%)</span><strong>${formatMoney(igv)}</strong></div>
          <div class="total-final total-row"><span>IMPORTE TOTAL</span><strong>${formatMoney(ventaData.total)}</strong></div>
        </div>
        
        <div style="clear: both;"></div>
        
        <div style="margin-top: 20px; font-size: 11px;">
          <strong>FORMA DE PAGO:</strong> ${ventaData.forma ? ventaData.forma.toUpperCase() : 'CONTADO'}<br>
          <strong>EFECTIVO RECIBIDO:</strong> ${formatMoney(ventaData.total)}<br>
          <strong>VUELTA:</strong> $ 0.00
        </div>
        
        <div class="qr-section">
          <img src="${qrURL}" alt="Código QR" style="width: 150px; height: 150px;">
          <p style="font-size: 10px; margin-top: 10px;">${ventaData.id || 'N/A'}</p>
        </div>
        
        <div class="footer">
          Representación impresa de la Boleta de Venta Electrónica<br>
          www.tudominio.com<br><br>
          <strong>GRACIAS POR TU COMPRA</strong>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          setTimeout(() => window.close(), 500);
        };
      </script>
    </body>
    </html>
  `;
  
  ventanaImpresion.document.write(facturaHTML);
  ventanaImpresion.document.close();
}
window.imprimirFactura = imprimirFactura;

// ========== FINALIZAR VENTA CON IMPRESIÓN ==========
document.getElementById('btnFinalizarVenta').addEventListener('click', async () => {
  const subtotal = carrito.reduce((sum, item) => sum + (item.precioVenta * item.cantidad), 0);
  const descuentoMonto = subtotal * (descuentoGlobal / 100);
  const total = subtotal - descuentoMonto;
  
  if (metodoPagoSeleccionado === 'efectivo') {
    const recibido = parseFloat(document.getElementById('montoRecibido').value) || 0;
    if (recibido < total) {
      mostrarMensaje('⚠️ Monto insuficiente', 'error');
      return;
    }
  }
  
  try {
    const ventaData = {
      id: `V${Date.now()}`,
      items: carrito.map(item => ({
        codigo: item.codigo || 'N/A',
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioVenta: item.precioVenta
      })),
      total: total,
      subtotal: subtotal,
      descuento: descuentoGlobal,
      forma: metodoPagoSeleccionado,
      cliente: clienteActual,
      nota: notaVenta || '',
      usuario: sesion.nombre || 'Cajero',
      timestamp: Date.now()
    };
    
    await Storage.registrarVenta(ventaData);
    
    for (const item of carrito) {
      const producto = productos.find(p => p.id === item.id);
      if (producto) {
        await Storage.editarProducto(producto.id, {

          ...producto,
          cantidad: producto.cantidad - item.cantidad
        });
      }
    }
    
    mostrarMensaje(`✅ Venta registrada: ${formatMoney(total)}`);
    
    const autoImpresion = document.getElementById('autoImpresion')?.checked;
    if (autoImpresion) {
      setTimeout(() => imprimirFactura(ventaData), 300);
    }
    
    carrito = [];
    descuentoGlobal = 0;
    clienteActual = { nombre: 'Mostrador', telefono: '' };
    notaVenta = '';
    document.getElementById('clienteInfo').textContent = 'Mostrador';
    document.getElementById('descuentoInfo').style.display = 'none';
    renderCarrito();
    cerrarModal('modalPago');
    document.getElementById('buscarCodigo').focus();
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
});

// ========== DEVOLUCIONES (CORREGIDO) ==========
function buscarVentaParaDevolucion() {
  const ventaId = document.getElementById('devolucionVentaId').value.trim();
  
  if (!ventaId) {
    mostrarMensaje('⚠️ Ingresa el ID de la venta', 'error');
    return;
  }
  
  const venta = ventas.find(v => v.id === ventaId);
  
  if (!venta) {
    mostrarMensaje('❌ Venta no encontrada', 'error');
    return;
  }
  
  ventaDevolucion = venta;
  
  const container = document.getElementById('productosDevolucion');
  container.innerHTML = '';
  
  venta.items.forEach((item, index) => {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 10px; border: 1px solid #ecf0f1; border-radius: 8px; margin-bottom: 10px;';
    div.innerHTML = `
      <label style="display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" data-item-index="${index}" checked>
        <div style="flex: 1;">
          <strong>${item.nombre}</strong>
          <div style="font-size: 12px; color: #7f8c8d;">
            Cantidad: ${item.cantidad} × ${formatMoney(item.precioVenta)} c/u
          </div>
        </div>
        <div><strong>${formatMoney(item.precioVenta * item.cantidad)}</strong></div>
      </label>
    `;
    container.appendChild(div);
  });
  
  document.getElementById('devolucionDetalles').style.display = 'block';
  mostrarMensaje(`✅ Venta encontrada: ${formatMoney(venta.total)}`);
}
window.buscarVentaParaDevolucion = buscarVentaParaDevolucion;

async function procesarDevolucion() {
  if (!ventaDevolucion) return;
  
  const motivo = document.getElementById('devolucionMotivo').value.trim();
  if (!motivo) {
    mostrarMensaje('⚠️ Describe el motivo de la devolución', 'error');
    return;
  }
  
  const itemsDevolver = [];
  document.querySelectorAll('#productosDevolucion input[type="checkbox"]:checked').forEach(checkbox => {
    const index = parseInt(checkbox.dataset.itemIndex);
    itemsDevolver.push(ventaDevolucion.items[index]);
  });
  
  if (itemsDevolver.length === 0) {
    mostrarMensaje('⚠️ Selecciona al menos un producto para devolver', 'error');
    return;
  }
  
  if (!confirm('¿Procesar la devolución? Se reintegrará el stock.')) {
    return;
  }
  
  try {
    const totalDevolucion = itemsDevolver.reduce((sum, item) => sum + (item.precioVenta * item.cantidad), 0);
    
    // 🔥 CREAR OBJETO DE DEVOLUCIÓN
    const devolucion = {
      id: `DEV${Date.now()}`,
      ventaId: ventaDevolucion.id,
      timestamp: Date.now(),
      fecha: new Date().toISOString(),
      cliente: ventaDevolucion.cliente,
      items: itemsDevolver.map(item => ({
        ...item,
        cantidadDevuelta: item.cantidad
      })),
      total: totalDevolucion,
      motivo: motivo,
      usuario: sesion.nombre || 'Cajero'
    };
    
    // 🔥 REGISTRAR DEVOLUCIÓN EN FIREBASE
    await Storage.registrarDevolucion(devolucion);
    console.log('✅ Devolución registrada en Firebase');
    
 // 🔥 DEVOLVER STOCK A LOS PRODUCTOS
for (const item of itemsDevolver) {
  const producto = productos.find(p => p.codigo === item.codigo);
  if (producto) {
    const nuevoStock = producto.cantidad + item.cantidad;
    await Storage.editarProducto(producto.id, { cantidad: nuevoStock });
    console.log(`✅ Stock devuelto: ${item.nombre} (+${item.cantidad}) → Nuevo stock: ${nuevoStock}`);
  }
}

    
    mostrarMensaje(`✅ Devolución procesada: ${formatMoney(totalDevolucion)}`);
    
    document.getElementById('devolucionVentaId').value = '';
    document.getElementById('devolucionMotivo').value = '';
    document.getElementById('devolucionDetalles').style.display = 'none';
    ventaDevolucion = null;
  } catch (err) {
    console.error('❌ Error al procesar devolución:', err);
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
}
window.procesarDevolucion = procesarDevolucion;

// ========== ESCÁNER ==========
let escanerActivo = false;

function iniciarEscaner() {
  if (escanerActivo) return;
  
  document.getElementById('modalEscaner').classList.add('show');
  escanerActivo = true;
  
  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: document.querySelector('#scanner-video'),
      constraints: { width: 640, height: 480, facingMode: 'environment' }
    },
    decoder: {
      readers: ['ean_reader', 'code_128_reader', 'code_39_reader', 'upc_reader']
    }
  }, (err) => {
    if (err) {
      console.error(err);
      mostrarMensaje('❌ Error al iniciar cámara', 'error');
      detenerEscaner();
      return;
    }
    console.log('✅ Escáner iniciado');
    Quagga.start();
  });
  
  Quagga.onDetected((data) => {
    const codigo = data.codeResult.code;
    console.log('Código detectado:', codigo);
    
    const producto = productos.find(p => p.codigo === codigo);
    if (producto) {
      agregarAlCarrito(producto.id);
      reproducirBeep();
      mostrarMensaje(`✅ Producto agregado: ${producto.nombre}`);
    } else {
      mostrarMensaje('❌ Producto no encontrado', 'error');
    }
    
    detenerEscaner();
  });
}

function detenerEscaner() {
  if (!escanerActivo) return;
  Quagga.stop();
  escanerActivo = false;
  cerrarModal('modalEscaner');
}
window.iniciarEscaner = iniciarEscaner;
window.detenerEscaner = detenerEscaner;

// ========== VENTAS ==========
function iniciarListenerVentas() {
  if (!Storage || !Storage.escucharVentas) return;
  
  console.log('🔄 Iniciando listener de ventas...');
  unsubscribeVentas = Storage.escucharVentas((ventasActualizadas) => {
    console.log('💰 Ventas actualizadas:', ventasActualizadas.length);
    ventas = ventasActualizadas;
    actualizarMiniStats();
  });
}

function renderHistorial() {
  const tbody = document.querySelector('#tablaVentas tbody');
  tbody.innerHTML = '';
  
  if (ventas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#999; padding:20px;">No hay ventas</td></tr>';
    return;
  }
  
  ventas.slice(0, 100).forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${v.id || 'N/A'}</td>
      <td>${formatDate(v.timestamp)}</td>
      <td><strong>${formatMoney(v.total)}</strong></td>
      <td>${v.cliente?.nombre || 'Mostrador'}</td>
      <td>${v.usuario || 'Sistema'}</td>
      <td>${v.forma || 'efectivo'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ========== MI TURNO ==========
function cargarMiTurno() {
  const hoy = new Date().setHours(0,0,0,0);
  const misVentas = ventas.filter(v => v.timestamp >= hoy && v.usuario === sesion.nombre);
  const totalVendido = misVentas.reduce((sum, v) => sum + v.total, 0);
  const productosVendidos = misVentas.reduce((sum, v) => {
    return sum + (v.items?.reduce((s, i) => s + i.cantidad, 0) || 0);
  }, 0);
  const promedioTicket = misVentas.length > 0 ? totalVendido / misVentas.length : 0;
  
  document.getElementById('miTurnoVentas').textContent = misVentas.length;
  document.getElementById('miTurnoTotal').textContent = formatMoney(totalVendido);
  document.getElementById('miTurnoProductos').textContent = productosVendidos;
  document.getElementById('miTurnoPromedio').textContent = formatMoney(promedioTicket);
  
  const productosConteo = {};
  misVentas.forEach(v => {
    v.items?.forEach(item => {
      if (!productosConteo[item.nombre]) {
        productosConteo[item.nombre] = { cantidad: 0, total: 0 };
      }
      productosConteo[item.nombre].cantidad += item.cantidad;
      productosConteo[item.nombre].total += item.precioVenta * item.cantidad;
    });
  });
  
  const top = Object.entries(productosConteo).sort((a, b) => b[1].cantidad - a[1].cantidad).slice(0, 10);
  
  const tbody = document.querySelector('#tablaTopProductosMios tbody');
  tbody.innerHTML = '';
  
  if (top.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:20px;">No has vendido productos hoy</td></tr>';
    return;
  }
  
  top.forEach(([nombre, data], index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${nombre}</td>
      <td><strong>${data.cantidad}</strong></td>
      <td>${formatMoney(data.total)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ========== MINI STATS ==========
 function actualizarMiniStats() {
  const hoy = new Date().setHours(0,0,0,0);
  const ventasHoy = ventas.filter(v => v.timestamp >= hoy);
  document.getElementById('miniVentasHoy').textContent = ventasHoy.length;
  
  // 🔥 CAMBIO: Restar devoluciones del total
  const totalVentas = ventasHoy.reduce((sum, v) => sum + v.total, 0);
  const devolucionesHoy = devoluciones.filter(d => d.timestamp >= hoy);
  const totalDevoluciones = devolucionesHoy.reduce((sum, d) => sum + d.total, 0);
  const totalReal = totalVentas - totalDevoluciones;
  
  document.getElementById('miniTotalHoy').textContent = formatMoney(totalReal);
  
  document.getElementById('miniPendientes').textContent = ventasPendientes.length;
  document.getElementById('miniProductos').textContent = productos.length;
}


// ========== SOPORTE ==========
document.getElementById('formSoporte').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nombre = document.getElementById('soporteNombre').value;
  const email = document.getElementById('soporteEmail').value;
  const tipo = document.getElementById('soporteTipo').value;
  const mensaje = document.getElementById('soporteMensaje').value;
  
  try {
    await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
      from_name: nombre,
      from_email: email,
      tipo: tipo,
      message: mensaje,
      negocio: sesion.nombre,
      usuario: sesion.nombre,
      fecha: new Date().toLocaleString('es-CO')
    });
    
    mostrarMensaje('✅ Mensaje enviado correctamente. Nos contactaremos pronto.');
    document.getElementById('formSoporte').reset();
  } catch (err) {
    console.error('Error:', err);
    mostrarMensaje('❌ Error al enviar el mensaje. Intenta de nuevo.', 'error');
  }
});

// ========== ATAJOS ==========
document.addEventListener('keydown', (e) => {
  if (e.key === 'F3') {
    e.preventDefault();
    document.getElementById('btnConfirmarVenta').click();
  }
  
  if (e.key === 'Escape') {
    if (document.querySelector('.modal.show')) {
      const modales = document.querySelectorAll('.modal.show');
      modales.forEach(m => m.classList.remove('show'));
    }
    if (escanerActivo) detenerEscaner();
  }
  
  if (e.key === 'F1') {
    e.preventDefault();
    document.getElementById('buscarCodigo').focus();
  }
});

// ========== UTILIDADES ==========
function formatMoney(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ========== INICIALIZACIÓN ==========
async function inicializar() {
  try {
    console.log('🚀 Iniciando panel de cajero PRO...');
    await esperarFirebase();
    
    if (!window.FB || !window.FB.db) {
      console.error('❌ Firebase no disponible');
      return;
    }
    
    iniciarListenerProductos();
    iniciarListenerVentas();
    iniciarListenerDevoluciones();
    await verificarCaja();
    await cargarCategorias();
    await cargarLogoNegocio();
    actualizarMiniStats();
    
    console.log('✅ Sistema con imágenes e impresión inicializado');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

inicializar();


// ========================================================================
// INTEGRACIÓN: CLIENTE POR CÉDULA + IMPRESIÓN DE TICKET TÉRMICO
// ========================================================================
(function () {
  const sesionActual = (typeof Auth !== 'undefined' && Auth.getSesion) ? Auth.getSesion() : { nombre: 'Cajero', id: '' };

  const POSCliente = {
    negocio: null,
    clienteSeleccionado: null,

    async init() {
      console.log('🎯 Inicializando módulo Cliente + Ticket');

      // Listeners de UI para cliente
      const btnBuscar = document.getElementById('btnBuscarClienteCajero');
      const btnRegistrar = document.getElementById('btnRegistrarClienteCajero');
      const btnLimpiar = document.getElementById('btnLimpiarClienteCajero');

      if (btnBuscar) btnBuscar.addEventListener('click', () => this.buscarPorCedula());
      if (btnRegistrar) btnRegistrar.addEventListener('click', () => this.registrarRapido());
      if (btnLimpiar) btnLimpiar.addEventListener('click', () => this.limpiar());

      // Listeners de modal de impresión
      const btnSi = document.getElementById('btnImprimirSi');
      const btnNo = document.getElementById('btnImprimirNo');

      if (btnSi) {
        btnSi.addEventListener('click', () => {
          const modal = document.getElementById('modalImprimirTicket');
          if (modal) modal.style.display = 'none';
          this.imprimirTicket();
        });
      }

      if (btnNo) {
        btnNo.addEventListener('click', () => {
          const modal = document.getElementById('modalImprimirTicket');
          if (modal) modal.style.display = 'none';
        });
      }

      // Cargar datos del negocio
      await this.cargarNegocio();
      this.pintarClienteUI();

      console.log('✅ Módulo Cliente + Ticket listo');
    },

    async cargarNegocio() {
      try {
        if (!Storage || !Storage.getNegocioById) {
          console.warn('Storage.getNegocioById no disponible');
          return;
        }

        const negocioData = await Storage.getNegocioById(sesionActual.id);

        this.negocio = {
          nombre: negocioData?.nombre || 'Mi Negocio',
          nit: negocioData?.nit || negocioData?.documento || '—',
          telefono: negocioData?.telefono || '—',
          direccion: negocioData?.direccion || '—',
          ciudad: negocioData?.ciudad || '—',
          logo: negocioData?.logo || ''
        };

        console.log('✅ Datos del negocio cargados:', this.negocio.nombre);
      } catch (error) {
        console.error('❌ Error al cargar datos del negocio:', error);
        this.negocio = {
          nombre: 'Mi Negocio',
          nit: '—',
          telefono: '—',
          direccion: '—',
          ciudad: '—',
          logo: ''
        };
      }
    },

    pintarClienteUI() {
      const label = document.getElementById('clienteSeleccionadoLabel');
      if (!label) return;

      if (this.clienteSeleccionado) {
        label.textContent = `Cliente: ${this.clienteSeleccionado.nombre} (${this.clienteSeleccionado.cedula || '—'})`;
        label.style.color = '#28a745';
      } else {
        label.textContent = 'Cliente: Mostrador';
        label.style.color = '#6c757d';
      }
    },

    async buscarPorCedula() {
      const input = document.getElementById('cedulaInputCajero');
      if (!input) return;

      const cedula = input.value.trim();
      if (!cedula) {
        alert('Por favor ingresa la cédula del cliente');
        return;
      }

      try {
        if (!Storage || !Storage.buscarClientePorCedula) {
          alert('Función de búsqueda no disponible');
          return;
        }

        const cliente = await Storage.buscarClientePorCedula(cedula);

        if (!cliente) {
          alert('❌ Cliente no encontrado. Puedes registrarlo usando el botón "Registrar nuevo"');
          return;
        }

        this.clienteSeleccionado = cliente;
        this.pintarClienteUI();
        alert(`✅ Cliente encontrado: ${cliente.nombre}`);

      } catch (error) {
        console.error('Error al buscar cliente:', error);
        alert('Error al buscar el cliente. Verifica la consola.');
      }
    },

    async registrarRapido() {
      const input = document.getElementById('cedulaInputCajero');
      if (!input) return;

      const cedula = input.value.trim();
      if (!cedula) {
        alert('Ingresa la cédula del cliente primero');
        return;
      }

      const nombre = prompt('Nombre completo del cliente:');
      if (!nombre) return;

      const telefono = prompt('Teléfono (opcional):') || '';
      const email = prompt('Email (opcional):') || '';

      try {
        if (!Storage || !Storage.agregarCliente) {
          alert('Función de registro no disponible');
          return;
        }

        const nuevoId = await Storage.agregarCliente({
          nombre: nombre.trim(),
          cedula: cedula.trim(),
          telefono: telefono.trim(),
          email: email.trim()
        });

        this.clienteSeleccionado = {
          id: nuevoId,
          nombre: nombre.trim(),
          cedula: cedula.trim(),
          telefono: telefono.trim(),
          email: email.trim()
        };

        this.pintarClienteUI();
        alert(`✅ Cliente registrado: ${nombre}`);

      } catch (error) {
        console.error('Error al registrar cliente:', error);
        alert(error?.message || 'No se pudo registrar el cliente');
      }
    },

    limpiar() {
      this.clienteSeleccionado = null;
      const input = document.getElementById('cedulaInputCajero');
      if (input) input.value = '';
      this.pintarClienteUI();
    },

    // ========== HOOK POST-VENTA ==========
    async onVentaGuardada(ventaGuardada) {
      console.log('🎯 Post-venta: procesando cliente y ticket');

      // Actualizar estadísticas del cliente si fue seleccionado
      if (this.clienteSeleccionado && this.clienteSeleccionado.id) {
        try {
          if (Storage && Storage.actualizarEstadisticasCliente) {
            await Storage.actualizarEstadisticasCliente(
              this.clienteSeleccionado.id,
              ventaGuardada?.total || 0
            );
            console.log('✅ Estadísticas del cliente actualizadas');
          }
        } catch (error) {
          console.warn('⚠️ No se pudieron actualizar las estadísticas del cliente:', error);
        }
      }

      // Componer ticket y mostrar confirmación de impresión
      this.componerTicket(ventaGuardada);
      this.confirmarImpresion();
    },

    confirmarImpresion() {
      const modal = document.getElementById('modalImprimirTicket');
      if (modal) {
        modal.style.display = 'block';
      }
    },

    componerTicket(venta) {
      console.log('🎫 Componiendo ticket...');

      // Datos del negocio
      const n = this.negocio || {};

      const logo = document.getElementById('tNegocioLogo');
      if (logo && n.logo) {
        logo.src = n.logo;
        logo.style.display = 'block';
      } else if (logo) {
        logo.style.display = 'none';
      }

      const elemNombre = document.getElementById('tNegocioNombre');
      const elemNIT = document.getElementById('tNegocioNIT');
      const elemDir = document.getElementById('tNegocioDireccion');
      const elemTel = document.getElementById('tNegocioTelefono');
      const elemCiudad = document.getElementById('tNegocioCiudad');

      if (elemNombre) elemNombre.textContent = n.nombre || 'Mi Negocio';
      if (elemNIT) elemNIT.textContent = `NIT: ${n.nit || '—'}`;
      if (elemDir) elemDir.textContent = `Dirección: ${n.direccion || '—'}`;
      if (elemTel) elemTel.textContent = `Tel: ${n.telefono || '—'}`;
      if (elemCiudad) elemCiudad.textContent = n.ciudad || '—';

      // Datos de la venta
      const fechaVenta = new Date(venta?.timestamp || Date.now());
      const fechaStr = fechaVenta.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const elemVentaId = document.getElementById('tVentaId');
      const elemFecha = document.getElementById('tVentaFecha');
      const elemCajero = document.getElementById('tCajero');

      if (elemVentaId) elemVentaId.textContent = venta?.id || venta?.numero || '—';
      if (elemFecha) elemFecha.textContent = fechaStr;
      if (elemCajero) elemCajero.textContent = sesionActual?.nombre || 'Cajero';

      // Cliente (si aplica)
      const clienteBox = document.getElementById('tClienteBox');
      const elemClienteNombre = document.getElementById('tClienteNombre');
      const elemClienteCedula = document.getElementById('tClienteCedula');

      if (this.clienteSeleccionado) {
        if (elemClienteNombre) elemClienteNombre.textContent = this.clienteSeleccionado.nombre || '—';
        if (elemClienteCedula) elemClienteCedula.textContent = this.clienteSeleccionado.cedula || '—';
        if (clienteBox) clienteBox.style.display = 'block';
      } else {
        if (clienteBox) clienteBox.style.display = 'none';
      }

      // Items de la venta
      const tbody = document.getElementById('tItems');
      if (tbody) {
        tbody.innerHTML = '';
        const items = venta?.items || venta?.productos || [];
        let subtotal = 0;

        items.forEach(item => {
          const cant = item.cantidad || 1;
          const precio = item.precio || item.precioVenta || 0;
          const totalItem = cant * precio;
          subtotal += totalItem;

          const tr = document.createElement('tr');

          const tdNombre = document.createElement('td');
          tdNombre.textContent = item.nombre || item.descripcion || 'Producto';
          tdNombre.style.textAlign = 'left';

          const tdCant = document.createElement('td');
          tdCant.textContent = String(cant);
          tdCant.style.textAlign = 'center';

          const tdTotal = document.createElement('td');
          tdTotal.textContent = this.formatMoney(totalItem);
          tdTotal.style.textAlign = 'right';

          tr.appendChild(tdNombre);
          tr.appendChild(tdCant);
          tr.appendChild(tdTotal);
          tbody.appendChild(tr);
        });
      }

      // Totales
      const descuento = venta?.descuento || 0;
      const impuesto = venta?.impuesto || venta?.iva || 0;
      const subtotalCalc = venta?.subtotal || 0;
      const total = venta?.total || 0;

      const elemSubtotal = document.getElementById('tSubtotal');
      const elemDescuento = document.getElementById('tDescuento');
      const elemImpuesto = document.getElementById('tImpuesto');
      const elemTotal = document.getElementById('tTotal');

      if (elemSubtotal) elemSubtotal.textContent = this.formatMoney(subtotalCalc);
      if (elemDescuento) elemDescuento.textContent = this.formatMoney(descuento);
      if (elemImpuesto) elemImpuesto.textContent = this.formatMoney(impuesto);
      if (elemTotal) elemTotal.textContent = this.formatMoney(total);

      console.log('✅ Ticket compuesto');
    },

    imprimirTicket() {
      console.log('🖨️ Imprimiendo ticket...');

      const contenedor = document.getElementById('ticketPrint');
      if (!contenedor) {
        console.error('❌ No se encontró el contenedor del ticket');
        return;
      }

      // Mostrar el ticket para que @media print lo tome
      contenedor.style.display = 'block';

      // Esperar un momento para que el navegador renderice
      setTimeout(() => {
        window.print();

        // Ocultar nuevamente después de imprimir
        setTimeout(() => {
          contenedor.style.display = 'none';
        }, 500);
      }, 100);
    },

    formatMoney(valor) {
      if (typeof formatMoney === 'function') {
        return formatMoney(valor);
      }
      const num = Number(valor) || 0;
      return '$' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
  };

  // ========== EXPONER API GLOBAL ==========
  window.POS = window.POS || {};
  window.POS.Cliente = POSCliente;
  window.POS.onVentaGuardada = (venta) => POSCliente.onVentaGuardada(venta);
  window.POS.getClienteSeleccionado = () => POSCliente.clienteSeleccionado;

  // ========== INICIALIZACIÓN ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => POSCliente.init());
  } else {
    POSCliente.init();
  }

  console.log('✅ Módulo Cliente y Ticket registrado');
})();

// ========================================================================
// FIN INTEGRACIÓN CLIENTE + TICKET
// ========================================================================
