// js/ventas.js
const Ventas = (function(){
  let negId = null;
  let carrito = [];
  let cameraOn = false;
  let streamHandle = null;
  let detector = null;
  let scanTimer = null;

  function calcTotal(){ return carrito.reduce((s,i)=> s + (i.precioVenta * i.cantidad), 0); }

  async function estadoCajaText(){
    const n = await Storage.getNegocioById(negId);
    const c = n.caja || {abierta:false};
    const el = document.getElementById('estadoCaja');
    if(!el) return;
    el.innerHTML = c?.abierta ? `<span class="badge">Caja abierta</span> | Inicial: ${UI.formatMoney(c.saldoInicial)}` : `<span class="badge">Caja cerrada</span>`;
  }

  async function uiAperturaCaja(){
    const n = await Storage.getNegocioById(negId);
    n.caja = n.caja || { abierta:false, saldoInicial:0, movimientos:[] };
    if(n.caja.abierta){ UI.toast('La caja ya está abierta'); return; }
    const monto = Number(prompt('Saldo inicial:', '0'))||0;
    n.caja.abierta = true;
    n.caja.saldoInicial = monto;
    n.caja.movimientos.push({ tipo:'apertura', monto, ts:Date.now() });
    await Storage.setCaja(negId, n.caja);
    UI.toast('Caja abierta');
    estadoCajaText();
  }

  async function uiCierreCaja(){
    const n = await Storage.getNegocioById(negId);
    if(!n.caja?.abierta){ UI.toast('No hay caja abierta'); return; }
    const contado = Number(prompt('Efectivo contado:', '0'))||0;
    n.caja.movimientos.push({ tipo:'cierre', contado, ts:Date.now() });
    n.caja.abierta = false;
    await Storage.setCaja(negId, n.caja);
    UI.toast('Caja cerrada');
    estadoCajaText();
  }

  async function agregarPorCodigo(){
    const el = document.getElementById('codigo');
    const code = (el?.value||'').trim();
    if(!code) return;
    const neg = await Storage.getNegocioById(negId);
    const p = (neg.productos||[]).find(x=>x.codigo.toLowerCase()===code.toLowerCase());
    if(!p){ UI.toast('Producto no encontrado'); return; }
    const ya = carrito.find(x=>x.codigo===p.codigo);
    if(ya){ ya.cantidad+=1; } else { carrito.push({ codigo:p.codigo, nombre:p.nombre, precioVenta:p.precioVenta||0, cantidad:1 }); }
    renderCarrito();
    el.value='';
  }

  async function buscar(){
    const q = (document.getElementById('busqueda')||{value:''}).value.trim().toLowerCase();
    const neg = await Storage.getNegocioById(negId);
    const list = (neg.productos||[]).filter(p=> p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0,20);
    const el = document.getElementById('sugerencias');
    el.innerHTML = list.map(p=>`<button class="btn light" onclick="Ventas.agregarDirecto('${p.codigo}')">${p.codigo} - ${p.nombre}</button>`).join(' ');
  }

  async function agregarDirecto(codigo){
    const neg = await Storage.getNegocioById(negId);
    const p = (neg.productos||[]).find(x=>x.codigo===codigo);
    if(!p) return;
    const ya = carrito.find(x=>x.codigo===p.codigo);
    if(ya){ ya.cantidad+=1; } else { carrito.push({ codigo:p.codigo, nombre:p.nombre, precioVenta:p.precioVenta||0, cantidad:1 }); }
    renderCarrito();
  }

  function renderCarrito(){
    const el = document.getElementById('carrito'); if(!el) return;
    const rows = carrito.map((i,idx)=>[
      i.codigo, i.nombre, i.cantidad, UI.formatMoney(i.precioVenta),
      UI.formatMoney(i.precioVenta*i.cantidad),
      `<button class="btn light" onclick="Ventas.cant(${idx},-1)">-</button>`+
      ` <button class="btn light" onclick="Ventas.cant(${idx},1)">+</button>`+
      ` <button class="btn warn" onclick="Ventas.del(${idx})">Quitar</button>`
    ]);
    UI.renderTable(el, ['Código','Nombre','Cant.','Precio','Subtotal','Acciones'], rows);
    const total = calcTotal();
    const tEl = document.getElementById('total'); if(tEl) tEl.textContent = 'Total: ' + UI.formatMoney(total);
  }

  function cant(idx, delta){
    carrito[idx].cantidad += delta;
    if(carrito[idx].cantidad<=0) carrito.splice(idx,1);
    renderCarrito();
  }

  function del(idx){ carrito.splice(idx,1); renderCarrito(); }

  async function confirmarVenta(){
    const total = calcTotal();
    if(total<=0){ UI.toast('Carrito vacío'); return; }
    const neg = await Storage.getNegocioById(negId);
    if(!neg.caja?.abierta){ UI.toast('No hay caja abierta'); return; }
    const forma = (document.getElementById('formaPago')||{value:'efectivo'}).value;
    const recibido = Number((document.getElementById('recibido')||{value:'0'}).value)||0;
    const vuelto = Math.max(0, recibido - total);
    // Descontar stock
    const productos = (neg.productos||[]).map(p=>{
      const item = carrito.find(i=>i.codigo===p.codigo);
      if(item){ return { ...p, cantidad: Math.max(0, (p.cantidad||0) - item.cantidad) }; }
      return p;
    });
    // Registrar venta + movimiento de caja
    const venta = { id:'V'+Date.now(), ts: Date.now(), items: carrito, total, forma, recibido, vuelto, synced:false };
    const mov = { tipo:'venta', monto: total, forma, ts: Date.now() };
    await Storage.addVenta(negId, venta, productos, mov);
    // Ticket
    const t = document.getElementById('ticket');
    t.innerHTML = `<pre>
      Inventario Maestro
      Fecha: ${new Date(venta.ts).toLocaleString()}
      ---------------------------------
      ${carrito.map(i=>`${i.nombre} x${i.cantidad}  ${i.precioVenta*i.cantidad}`).join('\n')}
      ---------------------------------
      TOTAL: ${total}
      Forma: ${forma}
      Recibido: ${recibido}
      Vuelto: ${vuelto}
    </pre>`;
    UI.toast('Venta registrada');
    carrito = [];
    renderCarrito();
  }

  function vaciarCarrito(){ carrito = []; renderCarrito(); }

  async function reporteHoy(){
    const el = document.getElementById('reporte'); if(!el) return;
    const n = await Storage.getNegocioById(negId);
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const ventas = (n.ventas||[]).filter(v=> v.ts >= hoy.getTime());
    const total = ventas.reduce((s,v)=> s+v.total, 0);
    UI.renderTable(el, ['Ventas','Total'], [[ventas.length, UI.formatMoney(total)]]);
  }

  async function reporteUltimosDias(d){
    const el = document.getElementById('reporte'); if(!el) return;
    const n = await Storage.getNegocioById(negId);
    const desde = Date.now() - d*24*60*60*1000;
    const ventas = (n.ventas||[]).filter(v=> v.ts >= desde);
    const total = ventas.reduce((s,v)=> s+v.total, 0);
    UI.renderTable(el, ['Días','Ventas','Total'], [[d, ventas.length, UI.formatMoney(total)]]);
  }

  // USB scanners act as keyboard: add on Enter
  function bindEnter(){
    const input = document.getElementById('codigo');
    if(!input) return;
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') { e.preventDefault(); agregarPorCodigo(); }
    });
  }

  async function toggleCamara(){
    const video = document.getElementById('video');
    if(cameraOn){
      clearInterval(scanTimer); scanTimer=null;
      if(streamHandle){ streamHandle.getTracks().forEach(t=>t.stop()); streamHandle=null; }
      video.style.display='none';
      cameraOn = false;
      return;
    }
    if(!('BarcodeDetector' in window)){
      UI.toast('Tu navegador no soporta lector por cámara');
      return;
    }
    detector = new BarcodeDetector({ formats: ['code_128','ean_13','qr_code','ean_8','upc_a','upc_e'] });
    try{
      streamHandle = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = streamHandle;
      video.style.display='block';
      cameraOn = true;
      scanTimer = setInterval(async ()=>{
        try{
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            const code = codes[0].rawValue;
            const input = document.getElementById('codigo');
            input.value = code;
            await agregarPorCodigo();
          }
        }catch(_){}
      }, 700);
    }catch(e){
      UI.toast('No se pudo acceder a la cámara');
    }
  }

  function init(){
    const neg = JSON.parse(localStorage.getItem('negocioActivo')||'null');
    negId = neg?.id || null;
    estadoCajaText();
    bindEnter();
  }

  function initPOS(){
    init();
    renderCarrito();
  }

  return { init, initPOS, agregarPorCodigo, buscar, agregarDirecto, renderCarrito, cant, del, confirmarVenta, vaciarCarrito, uiAperturaCaja, uiCierreCaja, reporteHoy, reporteUltimosDias, toggleCamara };
})();