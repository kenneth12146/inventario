// js/auth.js
const Auth = (function(){
  const SESSION_KEY_NEG = 'negocioActivo';
  const SESSION_KEY_USER = 'usuarioActivo';

  async function sha256(text){
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
  }
  function now(){ return Date.now(); }

  async function guardNegocio(){
    const neg = JSON.parse(localStorage.getItem(SESSION_KEY_NEG)||'null');
    if(!neg){ location.href='login.html'; }
  }
  async function guardRol(rol){
    await guardNegocio();
    const usr = JSON.parse(localStorage.getItem(SESSION_KEY_USER)||'null');
    if(!usr){ location.href='acceso.html'; return; }
    if(usr.rol !== rol){ location.href = usr.rol === 'administrador' ? 'dashboard.html' : 'ventas.html'; }
  }
  async function guardCaja(){
    await guardNegocio();
    const usr = JSON.parse(localStorage.getItem(SESSION_KEY_USER)||'null');
    if(!usr){ location.href='acceso.html'; return; }
  }

  async function loginNegocio(correo, pass){
    const neg = await Storage.getNegocioByEmail(correo);
    if(!neg) throw new Error('Negocio no encontrado');
    const ph = await sha256(pass);
    if((neg.passwordHash||'').toLowerCase()!==ph.toLowerCase()) throw new Error('Contraseña incorrecta');
    localStorage.setItem(SESSION_KEY_NEG, JSON.stringify({ id: neg.id, nombre: neg.nombre, correo: neg.correo, ts: now() }));
    return true;
  }
  async function logout(){
    localStorage.removeItem(SESSION_KEY_NEG);
    localStorage.removeItem(SESSION_KEY_USER);
    location.href='login.html';
  }

  async function loginInterno(usuario, pass){
    const neg = JSON.parse(localStorage.getItem(SESSION_KEY_NEG)||'null');
    if(!neg) throw new Error('Sin negocio activo');
    const n = await Storage.getNegocioById(neg.id);
    const ph = await sha256(pass);
    const u = (n.usuarios||[]).find(x=> x.usuario===usuario && (x.passwordHash||'').toLowerCase()===ph.toLowerCase());
    if(!u) throw new Error('Usuario o contraseña incorrectos');
    localStorage.setItem(SESSION_KEY_USER, JSON.stringify({ usuario:u.usuario, rol:u.rol, negId:n.id, ts: now() }));
    return u.rol;
  }
  async function logoutInterno(){
    localStorage.removeItem(SESSION_KEY_USER);
    location.href='acceso.html';
  }

  return { guardNegocio, guardRol, guardCaja, loginNegocio, loginInterno, logout, logoutInterno };
})();