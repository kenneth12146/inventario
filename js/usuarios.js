// js/usuarios.js
const Usuarios = (function(){
  let negId = null;

  async function getAll(){
    const neg = await Storage.getNegocioById(negId);
    return neg?.usuarios || [];
  }

  async function renderLista(){
    const usuarios = await getAll();
    const el = document.getElementById('listaUsuarios'); if(!el) return;
    const data = usuarios.map(u => [
      u.usuario, u.rol,
      `<button class="btn light" onclick="Usuarios.editar('${u.usuario}')">Editar</button>`+
      ` <button class="btn warn" onclick="Usuarios.eliminar('${u.usuario}')">Eliminar</button>`
    ]);
    UI.renderTable(el, ['Usuario','Rol','Acciones'], data);
  }

  async function formNuevo(){
    const usuario = prompt('Usuario:'); if(!usuario) return;
    const rol = prompt('Rol (administrador/cajero):','cajero')||'cajero';
    const pass = prompt('Contraseña:'); if(!pass) return;
    const hash = await hashText(pass);
    const usuarios = await getAll();
    if(usuarios.find(u=>u.usuario===usuario)){ UI.toast('Usuario ya existe'); return; }
    usuarios.push({ usuario, rol, passwordHash: hash });
    await Storage.setUsuarios(negId, usuarios);
    UI.toast('Usuario creado'); renderLista();
  }

  async function editar(usuario){
    const usuarios = await getAll();
    const u = usuarios.find(x=>x.usuario===usuario); if(!u) return;
    const rol = prompt('Rol (administrador/cajero):', u.rol)||u.rol;
    const cambiar = confirm('¿Cambiar contraseña?');
    if(cambiar){
      const pass = prompt('Nueva contraseña:'); if(pass){ u.passwordHash = await hashText(pass); }
    }
    u.rol = rol;
    await Storage.setUsuarios(negId, usuarios);
    UI.toast('Usuario actualizado'); renderLista();
  }

  async function eliminar(usuario){
    if(!(await UI.confirm('¿Eliminar usuario?'))) return;
    let usuarios = await getAll();
    usuarios = usuarios.filter(u=>u.usuario!==usuario);
    await Storage.setUsuarios(negId, usuarios);
    UI.toast('Usuario eliminado'); renderLista();
  }

  async function hashText(text){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function init(){
    const neg = JSON.parse(localStorage.getItem('negocioActivo')||'null');
    negId = neg?.id || null;
    renderLista();
  }

  return { init, renderLista, formNuevo, editar, eliminar };
})();