// js/productos.js
const Productos = (function(){
  let negId = null;

  function genCode(nombre, marca){
    const slug = (marca||'GEN') + '-' + (nombre||'PROD');
    return slug.toUpperCase().replace(/\s+/g,'').slice(0,10) + '-' + Math.floor(Math.random()*900+100);
  }

  async function getAll(){
    const neg = await Storage.getNegocioById(negId);
    return neg?.productos || [];
  }

  async function renderLista(){
    const filtro = (document.getElementById('filtroProducto')||{value:''}).value || '';
    const rows = await Storage.listProductos(negId, filtro);
    const el = document.getElementById('listaProductos'); if(!el) return;
    const data = rows.map(p => [
      `<span class="badge">${p.codigo}</span>`,
      `<div><strong>${p.nombre}</strong><br><span class="muted">${p.marca||''}</span></div>`,
      UI.formatMoney(p.precioCompra||0),
      UI.formatMoney(p.precioVenta||0),
      p.cantidad ?? 0,
      p.foto ? `<img src="${p.foto}" alt="" style="height:32px;border-radius:6px">` : '',
      `<button class="btn light" onclick="Productos.editar('${p.codigo}')">Editar</button>` +
      ` <button class="btn warn" onclick="Productos.eliminar('${p.codigo}')">Eliminar</button>`
    ]);
    UI.renderTable(el, ['Código','Producto','Costo','Precio','Stock','Foto','Acciones'], data);
  }

  async function formNuevo(){
    const nombre = prompt('Nombre del producto:'); if(!nombre) return;
    const marca = prompt('Marca / Categoría (opcional):','');
    let codigo = (prompt('Código (vacío para generar):','')||'').trim();
    if(!codigo){ codigo = genCode(nombre, marca); }
    const precioCompra = Number(prompt('Costo (compra):','0'))||0;
    const precioVenta = Number(prompt('Precio (venta):','0'))||0;
    const cantidad = Number(prompt('Stock inicial:','0'))||0;
    const foto = prompt('URL de foto (opcional):','');

    const productos = await getAll();
    if(productos.find(p=>p.codigo===codigo)){ UI.toast('Código ya existe'); return; }
    productos.push({codigo, nombre, marca, precioCompra, precioVenta, cantidad, foto});
    await Storage.setProductos(negId, productos);
    UI.toast('Producto creado');
    renderLista();
  }

  async function editar(codigo){
    const productos = await getAll();
    const p = productos.find(x=>x.codigo===codigo); if(!p) return;
    const nombre = prompt('Nombre:', p.nombre) || p.nombre;
    const marca = prompt('Marca/Categoría:', p.marca||'') || p.marca;
    const precioCompra = Number(prompt('Costo (compra):', p.precioCompra))||0;
    const precioVenta = Number(prompt('Precio (venta):', p.precioVenta))||0;
    const cantidad = Number(prompt('Stock:', p.cantidad))||0;
    const foto = prompt('URL de foto:', p.foto||'') || p.foto;
    Object.assign(p, { nombre, marca, precioCompra, precioVenta, cantidad, foto });
    await Storage.setProductos(negId, productos);
    UI.toast('Producto actualizado');
    renderLista();
  }

  async function eliminar(codigo){
    if(!(await UI.confirm('¿Eliminar producto?'))) return;
    let productos = await getAll();
    productos = productos.filter(p=>p.codigo!==codigo);
    await Storage.setProductos(negId, productos);
    UI.toast('Producto eliminado');
    renderLista();
  }

  function exportarCSV(){
    (async ()=>{
      const productos = await getAll();
      const rows = [['codigo','nombre','marca','precioCompra','precioVenta','cantidad','foto'],
        ...productos.map(p=>[p.codigo,p.nombre,p.marca||'',p.precioCompra,p.precioVenta,p.cantidad,p.foto||''])];
      const csv = rows.map(r=>r.join(',')).join('\n');
      const blob = new Blob([csv], {type:'text/csv'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='productos.csv'; a.click();
    })();
  }

  function importarCSV(){
    const input = document.createElement('input'); input.type='file'; input.accept='.csv';
    input.onchange = async ()=>{
      const file = input.files[0]; if(!file) return;
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      lines.shift(); // headers
      let productos = await getAll();
      lines.forEach(line=>{ const [codigo,nombre,marca,pc,pv,cant,foto] = line.split(','); 
        const ex = productos.find(p=>p.codigo===codigo);
        const obj = {codigo, nombre, marca, precioCompra:Number(pc)||0, precioVenta:Number(pv)||0, cantidad:Number(cant)||0, foto:foto||''};
        if(ex) Object.assign(ex, obj); else productos.push(obj);
      });
      await Storage.setProductos(negId, productos);
      UI.toast('Importación completada');
      renderLista();
    };
    input.click();
  }

  function init(){
    const neg = JSON.parse(localStorage.getItem('negocioActivo')||'null');
    negId = neg?.id || null;
    renderLista();
  }

  return { init, renderLista, formNuevo, editar, eliminar, exportarCSV, importarCSV };
})();