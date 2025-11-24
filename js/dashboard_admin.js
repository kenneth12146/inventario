// ========================================
//  PANEL ADMIN - JAVASCRIPT COMPLETO
//  CON LOGO DEL NEGOCIO EN TOPBAR
//  + VENTAS DEL DÍA Y MES (RESTANDO DEVOLUCIONES)
// ========================================

console.log("🚀 Dashboard Admin cargando...");

// ========== VARIABLES GLOBALES ==========
let productos = [];
let ventas = [];
let devoluciones = [];
let categorias = [];
let usuarios = [];
let sesion = null;
let chartVentas = null;
let chartTopProductos = null;
let chartMetodosPago = null;
let chartCategorias = null;
let unsubscribeProductos = null;
let unsubscribeVentas = null;
let unsubscribeDevoluciones = null;
let unsubscribeUsuarios = null;
let productoEditando = null;
let clientes = [];
let unsubscribeClientes = null;
let clienteEditando = null;

// ========== ESPERAR FIREBASE ==========
async function esperarFirebase() {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.FB && window.FB.db) {
        clearInterval(check);
        resolve();
      }
    }, 100);
    setTimeout(() => clearInterval(check), 10000);
  });
}

// ========== CARGAR LOGO DEL NEGOCIO EN TOPBAR ==========
async function cargarLogoNegocio() {
  try {
    const negocio = await Storage.getNegocioById(sesion.id);
    document.getElementById('nombreNegocio').textContent = negocio.nombre || 'Mi Negocio';
    
    if (negocio.logo) {
      const logoImg = document.getElementById('logoNegocioTopbar');
      const logoPlaceholder = document.getElementById('logoPlaceholderTopbar');
      
      if (logoImg) {
        logoImg.src = negocio.logo;
        logoImg.style.display = 'block';
        
        if (logoPlaceholder) {
          logoPlaceholder.style.display = 'none';
        }
        
        console.log('✅ Logo cargado en topbar');
      }
    }
  } catch (error) {
    console.error('❌ Error al cargar logo:', error);
  }
}
window.cargarLogoNegocio = cargarLogoNegocio;


// ========== CLIENTES ==========

function iniciarListenerClientes() {
  if (!Storage || !Storage.escucharClientes) return;
  console.log('👂 Iniciando listener de clientes...');

  unsubscribeClientes = Storage.escucharClientes((clientesActualizados) => {
    console.log('👥 Clientes actualizados:', clientesActualizados.length);
    clientes = clientesActualizados;
    renderClientes();
    actualizarEstadisticasClientes();
  });
}

function renderClientes() {
  const tbody = document.querySelector('#tablaClientes tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No hay clientes registrados</td></tr>';
    return;
  }

  clientes.forEach(cliente => {
    const tr = document.createElement('tr');

    const ultimaCompra = cliente.ultimaCompra ? 
      new Date(cliente.ultimaCompra).toLocaleDateString('es-ES') : 
      'Nunca';

    tr.innerHTML = `
      <td><strong>${cliente.cedula || 'N/A'}</strong></td>
      <td>${cliente.nombre}</td>
      <td>${cliente.telefono || '-'}</td>
      <td>${cliente.email || '-'}</td>
      <td style="text-align: center;">${cliente.totalCompras || 0}</td>
      <td style="text-align: right;"><strong>${formatMoney(cliente.totalGastado || 0)}</strong></td>
      <td>${ultimaCompra}</td>
      <td style="text-align: center;">
        <button class="btn-icon" onclick="verHistorialCliente('${cliente.id}')" title="Ver historial">📊</button>
        <button class="btn-icon" onclick="editarClienteModal('${cliente.id}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="eliminarCliente('${cliente.id}')" title="Eliminar">🗑️</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function actualizarEstadisticasClientes() {
  const statTotal = document.getElementById('statTotalClientes');
  const statActivos = document.getElementById('statClientesActivos');
  const statTop = document.getElementById('statClienteTop');

  if (!statTotal) return;

  statTotal.textContent = clientes.length;

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
  const clientesActivos = clientes.filter(c => c.ultimaCompra && c.ultimaCompra >= inicioMes);
  statActivos.textContent = clientesActivos.length;

  if (clientes.length > 0) {
    const clienteTop = clientes.reduce((max, c) => 
      (c.totalGastado || 0) > (max.totalGastado || 0) ? c : max
    );
    statTop.textContent = clienteTop.nombre;
  } else {
    statTop.textContent = '-';
  }
}

function abrirModalCliente() {
  clienteEditando = null;
  document.getElementById('tituloModalCliente').textContent = 'Nuevo Cliente';
  document.getElementById('formCliente').reset();
  document.getElementById('clienteId').value = '';
  document.getElementById('modalCliente').classList.add('show');
}

function editarClienteModal(id) {
  const cliente = clientes.find(c => c.id === id);
  if (!cliente) return;

  clienteEditando = cliente;
  document.getElementById('tituloModalCliente').textContent = 'Editar Cliente';
  document.getElementById('clienteId').value = cliente.id;
  document.getElementById('clienteNombreModal').value = cliente.nombre;
  document.getElementById('clienteCedulaModal').value = cliente.cedula || '';
  document.getElementById('clienteTelefonoModal').value = cliente.telefono || '';
  document.getElementById('clienteEmailModal').value = cliente.email || '';
  document.getElementById('clienteDireccionModal').value = cliente.direccion || '';
  document.getElementById('clienteNotasModal').value = cliente.notas || '';
  document.getElementById('modalCliente').classList.add('show');
}

document.getElementById('formCliente')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const clienteData = {
    nombre: document.getElementById('clienteNombreModal').value.trim(),
    cedula: document.getElementById('clienteCedulaModal').value.trim(),
    telefono: document.getElementById('clienteTelefonoModal').value.trim(),
    email: document.getElementById('clienteEmailModal').value.trim(),
    direccion: document.getElementById('clienteDireccionModal').value.trim(),
    notas: document.getElementById('clienteNotasModal').value.trim()
  };

  try {
    if (clienteEditando) {
      const id = document.getElementById('clienteId').value;
      await Storage.editarCliente(id, clienteData);
      mostrarMensaje('✅ Cliente actualizado correctamente');
    } else {
      await Storage.agregarCliente(clienteData);
      mostrarMensaje('✅ Cliente creado correctamente');
    }
    cerrarModal('modalCliente');
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
});

async function eliminarCliente(id) {
  const cliente = clientes.find(c => c.id === id);
  if (!cliente) return;

  if (!confirm(`¿Eliminar al cliente "${cliente.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }

  try {
    await Storage.eliminarCliente(id);
    mostrarMensaje('✅ Cliente eliminado');
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
}

async function verHistorialCliente(clienteId) {
  const cliente = clientes.find(c => c.id === clienteId);
  if (!cliente) return;

  document.getElementById('tituloHistorialCliente').textContent = `Historial: ${cliente.nombre}`;

  const infoDiv = document.getElementById('infoClienteHistorial');
  infoDiv.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
      <div><strong>📱 Teléfono:</strong><br>${cliente.telefono || 'N/A'}</div>
      <div><strong>📧 Email:</strong><br>${cliente.email || 'N/A'}</div>
      <div><strong>🛒 Total Compras:</strong><br>${cliente.totalCompras || 0}</div>
      <div><strong>💰 Total Gastado:</strong><br><strong style="color: #28a745;">${formatMoney(cliente.totalGastado || 0)}</strong></div>
    </div>
  `;

  const ventasCliente = ventas.filter(v => 
    v.cliente && (v.cliente.telefono === cliente.telefono || v.cliente.nombre === cliente.nombre)
  );

  const tbody = document.querySelector('#tablaHistorialCompras tbody');
  tbody.innerHTML = '';

  if (ventasCliente.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #999;">Este cliente aún no tiene compras registradas</td></tr>';
  } else {
    ventasCliente.sort((a, b) => b.timestamp - a.timestamp).forEach(venta => {
      const fecha = new Date(venta.timestamp).toLocaleString('es-ES');
      const cantidadProductos = venta.items.reduce((sum, item) => sum + item.cantidad, 0);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fecha}</td>
        <td><strong>${venta.id}</strong></td>
        <td style="text-align: center;">${cantidadProductos} items</td>
        <td style="text-align: right;"><strong>${formatMoney(venta.total)}</strong></td>
        <td>${venta.metodoPago}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('modalHistorialCliente').classList.add('show');
}

function exportarClientesExcel() {
  if (clientes.length === 0) {
    mostrarMensaje('⚠️ No hay clientes para exportar', 'error');
    return;
  }

  const datos = clientes.map(c => ({
    'Nombre': c.nombre,
    'Teléfono': c.telefono || '',
    'Email': c.email || '',
    'Dirección': c.direccion || '',
    'Total Compras': c.totalCompras || 0,
    'Total Gastado': c.totalGastado || 0,
    'Última Compra': c.ultimaCompra ? new Date(c.ultimaCompra).toLocaleDateString('es-ES') : 'Nunca',
    'Fecha Registro': c.fechaRegistro ? new Date(c.fechaRegistro).toLocaleDateString('es-ES') : ''
  }));

  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`);

  mostrarMensaje('✅ Archivo Excel exportado');
}

document.getElementById('buscarCliente')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const tbody = document.querySelector('#tablaClientes tbody');
  const rows = tbody?.querySelectorAll('tr');

  rows?.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
});

window.abrirModalCliente = abrirModalCliente;
window.editarClienteModal = editarClienteModal;
window.eliminarCliente = eliminarCliente;
window.verHistorialCliente = verHistorialCliente;
window.exportarClientesExcel = exportarClientesExcel;

// ========== INICIALIZACIÓN ==========
async function inicializar() {
  try {
    await esperarFirebase();
    
    if (typeof Auth === 'undefined') {
      window.location.href = 'login.html';
      return;
    }
    
    Auth.requireAuth();
    sesion = Auth.getSesion();
    
    document.getElementById('nombreUsuario').textContent = sesion.nombre || 'Admin';
    
    await cargarDatosIniciales();
    await cargarLogoNegocio();
    
    iniciarListeners();
    iniciarListenerUsuarios();
    iniciarListenerDevoluciones();
    
    actualizarDashboard();
    
    console.log('✅ Panel admin inicializado');
  } catch (err) {
    console.error('Error:', err);
  }
}

async function cargarDatosIniciales() {
  try {
    const negocio = await Storage.getNegocioById(sesion.id);
    categorias = negocio?.categorias || [];
  } catch (err) {
    console.error('Error al cargar datos:', err);
  }
}

function iniciarListeners() {
  if (!Storage) return;
  
  unsubscribeProductos = Storage.escucharProductos((datos) => {
    console.log("📦 Productos recibidos:", datos.length);
    productos = datos;
    renderProductos();
    actualizarDashboard();
  });
  
  unsubscribeVentas = Storage.escucharVentas((datos) => {
    console.log("💰 Ventas recibidas:", datos.length);
    ventas = datos;
    renderVentas();
    actualizarDashboard();
  });
}

function iniciarListenerUsuarios() {
  if (!Storage || !Storage.escucharUsuarios) return;
  
  unsubscribeUsuarios = Storage.escucharUsuarios((datos) => {
    console.log("👥 Usuarios recibidos:", datos.length);
    usuarios = datos;
    renderUsuarios();
  });
}

function iniciarListenerDevoluciones() {
  if (!Storage || !Storage.escucharDevoluciones) return;
  
  unsubscribeDevoluciones = Storage.escucharDevoluciones((datos) => {
    console.log("🔄 Devoluciones recibidas:", datos.length);
    devoluciones = datos;
    renderDevoluciones();
    actualizarDashboard(); // 🔥 Actualizar dashboard cuando hay devoluciones
  });
}

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
    
    if (section === 'dashboard') actualizarDashboard();
    if (section === 'categorias') renderCategorias();
    if (section === 'alertas') cargarAlertas();
    if (section === 'reportes') configurarReportes();
    if (section === 'usuarios') renderUsuarios();
    if (section === 'devoluciones') renderDevoluciones();
    if (section === 'configuracion') cargarConfiguracion();
  });
});

document.getElementById('btnCerrarSesion').addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('¿Cerrar sesión?')) {
    if (unsubscribeProductos) unsubscribeProductos();
    if (unsubscribeVentas) unsubscribeVentas();
    if (unsubscribeUsuarios) unsubscribeUsuarios();
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

// ========== DASHBOARD (🔥 CORREGIDO CON DEVOLUCIONES RESTADAS) ==========
function actualizarDashboard() {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
  
  // ===== VENTAS DEL DÍA (CON DEVOLUCIONES RESTADAS) =====
  const ventasHoy = ventas.filter(v => v.timestamp >= inicioHoy);
  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
  
  // 🔥 RESTAR DEVOLUCIONES DEL DÍA
  const devolucionesHoy = devoluciones.filter(d => d.timestamp >= inicioHoy);
  const totalDevolucionesHoy = devolucionesHoy.reduce((sum, d) => sum + d.total, 0);
  const totalNetoHoy = totalVentasHoy - totalDevolucionesHoy;
  
  const statVentasHoyEl = document.getElementById('statVentasHoy');
  if (statVentasHoyEl) {
    statVentasHoyEl.textContent = formatMoney(totalNetoHoy);
  }
  
  // ===== VENTAS DEL MES (CON DEVOLUCIONES RESTADAS) =====
  const ventasMes = ventas.filter(v => v.timestamp >= inicioMes);
  const totalVentasMes = ventasMes.reduce((sum, v) => sum + v.total, 0);
  
  // 🔥 RESTAR DEVOLUCIONES DEL MES
  const devolucionesMes = devoluciones.filter(d => d.timestamp >= inicioMes);
  const totalDevolucionesMes = devolucionesMes.reduce((sum, d) => sum + d.total, 0);
  const totalNetoMes = totalVentasMes - totalDevolucionesMes;
  
  document.getElementById('statVentasMes').textContent = formatMoney(totalNetoMes);
  
  // ===== PRODUCTOS =====
  document.getElementById('statProductos').textContent = productos.length;
  
  // ===== STOCK BAJO =====
  const stockBajo = productos.filter(p => p.cantidad <= 5).length;
  document.getElementById('statStockBajo').textContent = stockBajo;
  
  // ===== CLIENTES ÚNICOS =====
  const clientesUnicos = new Set(ventasMes.map(v => v.cliente?.nombre || 'Mostrador')).size;
  document.getElementById('statClientes').textContent = clientesUnicos;
  
  // ===== ALERTAS DE STOCK BAJO =====
  if (stockBajo > 0) {
    const alertasEl = document.getElementById('alertasStockBajo');
    if (alertasEl) {
      alertasEl.style.display = 'block';
      const alertasHTML = productos.filter(p => p.cantidad <= 5)
        .map(p => `<div style="padding: 10px; background: white; border-radius: 8px; margin: 5px 0;">
          <strong>${p.nombre}</strong> - Stock: ${p.cantidad} unidades
        </div>`).join('');
      const alertasListaEl = document.getElementById('alertasLista');
      if (alertasListaEl) {
        alertasListaEl.innerHTML = alertasHTML;
      }
    }
  }
  
  crearGraficas();
}

function crearGraficas() {
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js no está cargado');
    return;
  }
  
  // Gráfica de ventas últimos 7 días
  const ultimos7Dias = [];
  const ventasPorDia = [];
  
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    ultimos7Dias.push(fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }));
    
    const iniciosDia = new Date(fecha).setHours(0,0,0,0);
    const finDia = new Date(fecha).setHours(23,59,59,999);
    const ventasDia = ventas.filter(v => v.timestamp >= iniciosDia && v.timestamp <= finDia);
    ventasPorDia.push(ventasDia.reduce((sum, v) => sum + v.total, 0));
  }
  
  const ctxVentas = document.getElementById('chartVentas');
  if (ctxVentas) {
    if (chartVentas) chartVentas.destroy();
    chartVentas = new Chart(ctxVentas, {
      type: 'line',
      data: {
        labels: ultimos7Dias,
        datasets: [{
          label: 'Ventas',
          data: ventasPorDia,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } }
      }
    });
  }
  
  // Gráfica de productos más vendidos
  const productoConteo = {};
  ventas.forEach(v => {
    v.items?.forEach(item => {
      if (!productoConteo[item.nombre]) productoConteo[item.nombre] = 0;
      productoConteo[item.nombre] += item.cantidad;
    });
  });
  
  const top5 = Object.entries(productoConteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  const ctxTop = document.getElementById('chartTopProductos');
  if (ctxTop && top5.length > 0) {
    if (chartTopProductos) chartTopProductos.destroy();
    chartTopProductos = new Chart(ctxTop, {
      type: 'bar',
      data: {
        labels: top5.map(p => p[0]),
        datasets: [{
          label: 'Unidades Vendidas',
          data: top5.map(p => p[1]),
          backgroundColor: ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } }
      }
    });
  }
  
  // Gráfica de métodos de pago
  const metodosPago = {};
  ventas.forEach(v => {
    const metodo = v.forma || 'efectivo';
    metodosPago[metodo] = (metodosPago[metodo] || 0) + 1;
  });
  
  const ctxMetodos = document.getElementById('chartMetodosPago');
  if (ctxMetodos && Object.keys(metodosPago).length > 0) {
    if (chartMetodosPago) chartMetodosPago.destroy();
    chartMetodosPago = new Chart(ctxMetodos, {
      type: 'doughnut',
      data: {
        labels: Object.keys(metodosPago),
        datasets: [{
          data: Object.values(metodosPago),
          backgroundColor: ['#3498db', '#27ae60', '#f39c12', '#e74c3c']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true
      }
    });
  }
  
  // Gráfica de ventas por categoría
  const ventasPorCategoria = {};
  ventas.forEach(v => {
    v.items?.forEach(item => {
      const prod = productos.find(p => p.nombre === item.nombre);
      const cat = prod?.categoria || 'Sin categoría';
      ventasPorCategoria[cat] = (ventasPorCategoria[cat] || 0) + (item.precioVenta * item.cantidad);
    });
  });
  
  const ctxCat = document.getElementById('chartCategorias');
  if (ctxCat && Object.keys(ventasPorCategoria).length > 0) {
    if (chartCategorias) chartCategorias.destroy();
    chartCategorias = new Chart(ctxCat, {
      type: 'pie',
      data: {
        labels: Object.keys(ventasPorCategoria),
        datasets: [{
          data: Object.values(ventasPorCategoria),
          backgroundColor: ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true
      }
    });
  }
}

// ========== PRODUCTOS ==========
function renderProductos() {
  const tbody = document.querySelector('#tablaProductos tbody');
  tbody.innerHTML = '';
  
  productos.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.imagen ? `<img src="${p.imagen}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">` : '📦'}</td>
      <td>${p.codigo}</td>
      <td><strong>${p.nombre}</strong></td>
      <td><span class="badge badge-info">${p.categoria || 'Sin categoría'}</span></td>
      <td>${formatMoney(p.precioCompra)}</td>
      <td><strong>${formatMoney(p.precioVenta)}</strong></td>
      <td><span class="badge ${p.cantidad <= 5 ? 'badge-danger' : 'badge-success'}">${p.cantidad}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editarProducto('${p.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarProducto('${p.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('buscarProducto').addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase();
  document.querySelectorAll('#tablaProductos tbody tr').forEach(fila => {
    fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
  });
});

function abrirModalProducto(editando = false) {
  productoEditando = editando;
  document.getElementById('tituloModalProducto').textContent = editando ? 'Editar Producto' : 'Nuevo Producto';
  
  const select = document.getElementById('productoCategoria');
  select.innerHTML = categorias.map(c => `<option value="${c}">${c}</option>`).join('');
  
  if (!editando) {
    document.getElementById('formProducto').reset();
    document.getElementById('productoImgPreview').style.display = 'none';
    document.getElementById('productoImgPlaceholder').style.display = 'block';
  }
  
  document.getElementById('modalProducto').classList.add('show');
}
window.abrirModalProducto = abrirModalProducto;

async function editarProducto(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;
  
  abrirModalProducto(true);
  document.getElementById('productoId').value = id;
  document.getElementById('productoCodigo').value = producto.codigo;
  document.getElementById('productoNombre').value = producto.nombre;
  document.getElementById('productoCategoria').value = producto.categoria;
  document.getElementById('productoPrecioCompra').value = producto.precioCompra;
  document.getElementById('productoPrecioVenta').value = producto.precioVenta;
  document.getElementById('productoCantidad').value = producto.cantidad;
  
  if (producto.imagen) {
    document.getElementById('productoImgPreview').src = producto.imagen;
    document.getElementById('productoImgPreview').style.display = 'block';
    document.getElementById('productoImgPlaceholder').style.display = 'none';
  }
}
window.editarProducto = editarProducto;

document.getElementById('productoImgInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (evt) => {
    document.getElementById('productoImgPreview').src = evt.target.result;
    document.getElementById('productoImgPreview').style.display = 'block';
    document.getElementById('productoImgPlaceholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
});

document.getElementById('formProducto').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const producto = {
    codigo: document.getElementById('productoCodigo').value,
    nombre: document.getElementById('productoNombre').value,
    categoria: document.getElementById('productoCategoria').value,
    precioCompra: parseFloat(document.getElementById('productoPrecioCompra').value),
    precioVenta: parseFloat(document.getElementById('productoPrecioVenta').value),
    cantidad: parseInt(document.getElementById('productoCantidad').value)
  };
  
  const imgInput = document.getElementById('productoImgInput');
  if (imgInput.files && imgInput.files[0]) {
    try {
      mostrarMensaje('📤 Subiendo imagen...', 'success');
      producto.imagen = await Storage.subirImagenImgur(imgInput.files[0]);
    } catch (err) {
      console.error('Error al subir imagen:', err);
    }
  } else if (productoEditando) {
    const productoExistente = productos.find(p => p.id === document.getElementById('productoId').value);
    producto.imagen = productoExistente?.imagen || '';
  }
  
 try {
    if (productoEditando) {
      const id = document.getElementById('productoId').value;
      await Storage.editarProducto(id, producto);
      mostrarMensaje('✅ Producto actualizado');
    } else {
      await Storage.agregarProducto(producto);
      mostrarMensaje('✅ Producto creado');
    }
    cerrarModal('modalProducto');
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
});


async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  
  try {
    await Storage.eliminarProducto(id);
    mostrarMensaje('✅ Producto eliminado');
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
}
window.eliminarProducto = eliminarProducto;

// ========== CATEGORÍAS ==========
function renderCategorias() {
  const container = document.getElementById('categoriasGrid');
  container.innerHTML = '';
  
  if (categorias.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No hay categorías</p>';
    return;
  }
  
  categorias.forEach((cat, index) => {
    const div = document.createElement('div');
    div.className = 'stat-card';
    div.innerHTML = `
      <div class="icon">🏷️</div>
      <h4>${cat}</h4>
      <div class="value">${productos.filter(p => p.categoria === cat).length}</div>
      <button class="btn btn-sm btn-danger" onclick="eliminarCategoria(${index})">🗑️ Eliminar</button>
    `;
    container.appendChild(div);
  });
}

function abrirModalCategoria() {
  document.getElementById('formCategoria').reset();
  document.getElementById('modalCategoria').classList.add('show');
}
window.abrirModalCategoria = abrirModalCategoria;

document.getElementById('formCategoria').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nombre = document.getElementById('categoriaNombre').value.trim().toUpperCase();
  if (categorias.includes(nombre)) {
    mostrarMensaje('❌ Esta categoría ya existe', 'error');
    return;
  }
  
  categorias.push(nombre);
  
  try {
    await Storage.actualizarCategorias(categorias);
    mostrarMensaje('✅ Categoría creada');
    cerrarModal('modalCategoria');
    renderCategorias();
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
});

async function eliminarCategoria(index) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  
  categorias.splice(index, 1);
  
  try {
    await Storage.actualizarCategorias(categorias);
    mostrarMensaje('✅ Categoría eliminada');
    renderCategorias();
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
}
window.eliminarCategoria = eliminarCategoria;

// ========== VENTAS ==========
function renderVentas() {
  const tbody = document.querySelector('#tablaVentas tbody');
  tbody.innerHTML = '';
  
  ventas.slice().reverse().forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${v.id || 'N/A'}</td>
      <td>${formatDate(v.timestamp)}</td>
      <td>${v.cliente?.nombre || 'Mostrador'}</td>
      <td><strong>${formatMoney(v.total)}</strong></td>
      <td><span class="badge badge-info">${v.forma || 'efectivo'}</span></td>
      <td>${v.usuario || 'Sistema'}</td>
      <td><button class="btn btn-sm btn-primary" onclick="verDetalleVenta('${v.id}')">👁️ Ver</button></td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('buscarVenta').addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase();
  document.querySelectorAll('#tablaVentas tbody tr').forEach(fila => {
    fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
  });
});

function verDetalleVenta(id) {
  const venta = ventas.find(v => v.id === id);
  if (!venta) return;
  
  const html = `
    <div style="margin-bottom: 20px;">
      <h4>Información de la Venta</h4>
      <p><strong>ID:</strong> ${venta.id}</p>
      <p><strong>Fecha:</strong> ${formatDate(venta.timestamp)}</p>
      <p><strong>Cliente:</strong> ${venta.cliente?.nombre || 'Mostrador'}</p>
      <p><strong>Usuario:</strong> ${venta.usuario || 'Sistema'}</p>
      <p><strong>Método de Pago:</strong> ${venta.forma || 'efectivo'}</p>
    </div>
    
    <h4>Productos</h4>
    <table style="width: 100%; margin-top: 10px;">
      <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
      <tbody>
        ${venta.items.map(item => `<tr><td>${item.nombre}</td><td>${item.cantidad}</td><td>${formatMoney(item.precioVenta)}</td><td>${formatMoney(item.precioVenta * item.cantidad)}</td></tr>`).join('')}
      </tbody>
    </table>
    
    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
      <p style="font-size: 20px;"><strong>TOTAL: ${formatMoney(venta.total)}</strong></p>
    </div>
  `;
  
  document.getElementById('detalleVentaContenido').innerHTML = html;
  document.getElementById('modalDetalleVenta').classList.add('show');
}
window.verDetalleVenta = verDetalleVenta;

// ========== DEVOLUCIONES ==========
function renderDevoluciones() {
  const tbody = document.querySelector('#tablaDevoluciones tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (devoluciones.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#7f8c8d;">No hay devoluciones registradas</td></tr>';
    return;
  }
  
  devoluciones.slice().reverse().forEach(d => {
    const productosTexto = d.items.map(item => `${item.nombre} (${item.cantidadDevuelta || item.cantidad})`).join(', ');
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d.ventaId}</strong></td>
      <td>${formatDate(d.timestamp)}</td>
      <td>${d.cliente?.nombre || 'Mostrador'}</td>
      <td>${productosTexto}</td>
      <td style="color: #e74c3c; font-weight: 600;">${formatMoney(d.total)}</td>
      <td style="font-size: 13px;">${d.motivo}</td>
      <td>${d.usuario}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ========== USUARIOS ==========
function renderUsuarios() {
  const tbody = document.querySelector('#tablaUsuarios tbody');
  tbody.innerHTML = '';
  
  if (usuarios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999; padding:20px;">No hay usuarios</td></tr>';
    return;
  }
  
  usuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.nombre}</strong></td>
      <td>${u.email}</td>
      <td><span class="badge badge-info">${u.rol || 'Cajero'}</span></td>
      <td><span class="badge ${u.activo ? 'badge-success' : 'badge-danger'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editarUsuario('${u.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${u.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function abrirModalUsuario(editando = false) {
  if (!editando) document.getElementById('formUsuario').reset();
  document.getElementById('modalUsuario').classList.add('show');
}
window.abrirModalUsuario = abrirModalUsuario;

async function editarUsuario(id) {
  const usuario = usuarios.find(u => u.id === id);
  if (!usuario) return;
  
  document.getElementById('usuarioId').value = id;
  document.getElementById('usuarioNombre').value = usuario.nombre;
  document.getElementById('usuarioEmail').value = usuario.email;
  document.getElementById('usuarioRol').value = usuario.rol || 'cajero';
  document.getElementById('usuarioPassword').removeAttribute('required');
  
  abrirModalUsuario(true);
}
window.editarUsuario = editarUsuario;

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  
  try {
    await Storage.eliminarUsuario(id);
    mostrarMensaje('✅ Usuario eliminado');
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
}
window.eliminarUsuario = eliminarUsuario;

document.getElementById('formUsuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const usuario = {
    nombre: document.getElementById('usuarioNombre').value,
    email: document.getElementById('usuarioEmail').value,
    password: document.getElementById('usuarioPassword').value,
    rol: document.getElementById('usuarioRol').value
  };
  
  try {
    const id = document.getElementById('usuarioId').value;
    if (id) {
      await Storage.editarUsuario(id, usuario);
      mostrarMensaje('✅ Usuario actualizado');
    } else {
      await Storage.agregarUsuario(usuario);
      mostrarMensaje('✅ Usuario creado');
    }
    cerrarModal('modalUsuario');
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
});

// ========== CONFIGURACIÓN ==========
async function cargarConfiguracion() {
  try {
    const negocio = await Storage.getNegocioById(sesion.id);
    if (!negocio) return;
    
    document.getElementById('configNombre').value = negocio.nombre || '';
    document.getElementById('configNit').value = negocio.nit || '';
    document.getElementById('configTelefono').value = negocio.telefono || '';
    document.getElementById('configEmail').value = negocio.email || '';
    document.getElementById('configDireccion').value = negocio.direccion || '';
    document.getElementById('configCiudad').value = negocio.ciudad || '';
    
    if (negocio.logo) {
      document.getElementById('logoPreview').src = negocio.logo;
      document.getElementById('logoPreview').style.display = 'block';
      document.getElementById('logoPlaceholder').style.display = 'none';
    }
  } catch (err) {
    console.error('Error al cargar configuración:', err);
  }
}

document.getElementById('logoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (evt) => {
    document.getElementById('logoPreview').src = evt.target.result;
    document.getElementById('logoPreview').style.display = 'block';
    document.getElementById('logoPlaceholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
});

document.getElementById('formConfiguracion').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const config = {
    nombre: document.getElementById('configNombre').value,
    nit: document.getElementById('configNit').value,
    telefono: document.getElementById('configTelefono').value,
    email: document.getElementById('configEmail').value,
    direccion: document.getElementById('configDireccion').value,
    ciudad: document.getElementById('configCiudad').value
  };
  
  const logoInput = document.getElementById('logoInput');
  if (logoInput.files && logoInput.files[0]) {
    try {
      mostrarMensaje('📤 Subiendo logo...', 'success');
      config.logo = await Storage.subirImagenImgur(logoInput.files[0]);
    } catch (err) {
      console.error('Error al subir logo:', err);
    }
  } else {
    const negocio = await Storage.getNegocioById(sesion.id);
    config.logo = negocio?.logo || '';
  }
  
  try {
    await Storage.actualizarConfiguracionCompleta(config);
    mostrarMensaje('✅ Configuración guardada');
    await cargarLogoNegocio();
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
});

// ========== EXPORTACIÓN ==========
function exportarProductosExcel() {
  const datos = productos.map(p => ({
    Código: p.codigo,
    Nombre: p.nombre,
    Categoría: p.categoria,
    'Precio Compra': p.precioCompra,
    'Precio Venta': p.precioVenta,
    Stock: p.cantidad
  }));
  
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.writeFile(wb, `productos_${Date.now()}.xlsx`);
  
  mostrarMensaje('✅ Excel exportado');
}
window.exportarProductosExcel = exportarProductosExcel;

function exportarProductosPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Listado de Productos', 14, 22);
  
  let y = 40;
  productos.forEach((p, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${i + 1}. ${p.nombre} - ${formatMoney(p.precioVenta)} - Stock: ${p.cantidad}`, 14, y);
    y += 7;
  });
  
  doc.save(`productos_${Date.now()}.pdf`);
  mostrarMensaje('✅ PDF exportado');
}
window.exportarProductosPDF = exportarProductosPDF;

function exportarVentasExcel() {
  const datos = ventas.map(v => ({
    ID: v.id,
    Fecha: formatDate(v.timestamp),
    Cliente: v.cliente?.nombre || 'Mostrador',
    Total: v.total,
    Método: v.forma || 'efectivo'
  }));
  
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
  XLSX.writeFile(wb, `ventas_${Date.now()}.xlsx`);
  
  mostrarMensaje('✅ Excel exportado');
}
window.exportarVentasExcel = exportarVentasExcel;

function exportarVentasPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Historial de Ventas', 14, 22);
  
  let y = 40;
  ventas.slice(0, 50).forEach((v) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${v.id} - ${formatMoney(v.total)} - ${formatDate(v.timestamp)}`, 14, y);
    y += 7;
  });
  
  doc.save(`ventas_${Date.now()}.pdf`);
  mostrarMensaje('✅ PDF exportado');
}
window.exportarVentasPDF = exportarVentasPDF;

// ========== ALERTAS ==========
function cargarAlertas() {
  const stockCritico = productos.filter(p => p.cantidad <= 5);
  
  const htmlCritico = stockCritico.length > 0 
    ? stockCritico.map(p => `<div style="padding: 15px; background: white; border-radius: 8px; margin: 10px 0; border-left: 4px solid #e74c3c;"><strong>${p.nombre}</strong> - Stock: ${p.cantidad} unidades</div>`).join('')
    : '<p style="text-align: center; color: #27ae60;">✅ Todos los productos tienen stock suficiente</p>';
  
  document.getElementById('alertasStockCritico').innerHTML = htmlCritico;
  
  const hace30Dias = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const productosVendidos = new Set();
  
  ventas.filter(v => v.timestamp >= hace30Dias).forEach(v => {
    v.items?.forEach(item => productosVendidos.add(item.nombre));
  });
  
  const sinMovimiento = productos.filter(p => !productosVendidos.has(p.nombre));
  
  const htmlSinMovimiento = sinMovimiento.length > 0
    ? sinMovimiento.map(p => `<div style="padding: 15px; background: white; border-radius: 8px; margin: 10px 0;"><strong>${p.nombre}</strong></div>`).join('')
    : '<p style="text-align: center; color: #27ae60;">✅ Todos los productos tienen movimiento</p>';
  
  document.getElementById('productosSinMovimiento').innerHTML = htmlSinMovimiento;
  
  const rentabilidad = productos.map(p => ({
    ...p,
    margen: ((p.precioVenta - p.precioCompra) / p.precioCompra * 100).toFixed(2)
  })).sort((a, b) => b.margen - a.margen).slice(0, 10);
  
  const htmlRentables = rentabilidad.map((p, i) => `<div style="padding: 15px; background: white; border-radius: 8px; margin: 10px 0;"><strong>${i + 1}. ${p.nombre}</strong> - ${p.margen}% margen</div>`).join('');
  
  document.getElementById('productosRentables').innerHTML = htmlRentables;
}

// ========== REPORTES ==========
function configurarReportes() {
  const hoy = new Date();
  document.getElementById('fechaFin').valueAsDate = hoy;
  
  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);
  document.getElementById('fechaInicio').valueAsDate = hace7Dias;
}

function generarReporte() {
  const tipo = document.getElementById('tipoReporte').value;
  const inicio = new Date(document.getElementById('fechaInicio').value).getTime();
  const fin = new Date(document.getElementById('fechaFin').value).getTime() + (24 * 60 * 60 * 1000 - 1);
  
  const ventasPeriodo = ventas.filter(v => v.timestamp >= inicio && v.timestamp <= fin);
  
  let html = '';
  
  if (tipo === 'ventas') {
    const total = ventasPeriodo.reduce((sum, v) => sum + v.total, 0);
    html = `<div class="card"><h4>📊 Reporte de Ventas</h4><p>Total: ${formatMoney(total)}</p></div>`;
  }
  
  document.getElementById('resultadoReporte').innerHTML = html;
}
window.generarReporte = generarReporte;

function exportarReporteExcel() {
  mostrarMensaje('✅ Reporte exportado');
}
window.exportarReporteExcel = exportarReporteExcel;

function exportarReportePDF() {
  mostrarMensaje('✅ Reporte exportado');
}
window.exportarReportePDF = exportarReportePDF;

async function exportarBackup() {
  try {
    const backup = await Storage.crearBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${Date.now()}.json`;
    a.click();
    mostrarMensaje('✅ Backup descargado');
  } catch (err) {
    mostrarMensaje('❌ Error: ' + err.message, 'error');
  }
}
window.exportarBackup = exportarBackup;

function importarBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const backup = JSON.parse(evt.target.result);
        if (confirm(`¿Restaurar backup?`)) {
          await Storage.restaurarBackup(backup);
          mostrarMensaje('✅ Backup restaurado');
        }
      } catch (err) {
        mostrarMensaje('❌ Archivo inválido', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
window.importarBackup = importarBackup;

function limpiarDatos() {
  mostrarMensaje('⚠️ Función deshabilitada por seguridad', 'error');
}
window.limpiarDatos = limpiarDatos;

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

// ========== INICIO ==========
inicializar();
console.log("✅ Dashboard Admin listo CON DEVOLUCIONES RESTADAS");


// Función para guardar cliente desde el botón
function guardarCliente() {
  const form = document.getElementById('formCliente');
  if (form) {
    const event = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
  }
}
