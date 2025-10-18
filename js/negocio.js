// js/negocio.js
const Negocio = (function(){
  async function sha256(text){
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
  }
  function genId(nombre){ return (nombre||'NEG').toUpperCase().replace(/\W+/g,'').slice(0,5) + Math.floor(Math.random()*900+100); }

  async function registrarNegocio(nombre, correo, pass){
    const id = await Storage.registrarNegocio(nombre, correo, pass);
    return id;
  }

  return { registrarNegocio };
})();