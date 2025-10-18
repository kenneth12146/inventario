// js/storage.js - Firestore-backed global Storage
(function(){
  const FB = window.FB;
  if(!FB){ console.error('Firebase not loaded'); return; }

  async function sha256(text){
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
  }

  const Storage = {
    // Obtener negocio por email
    async getNegocioByEmail(email){
      const q = FB.query(FB.collection(FB.db, 'negocios'), FB.where('correo', '==', email));
      const snap = await FB.getDocs(q);
      let negocio = null;
      snap.forEach(docu => { negocio = { id: docu.id, ...docu.data() }; });
      return negocio;
    },

    async getNegocioById(id){
      const docu = await FB.getDoc(FB.doc(FB.db, 'negocios', id));
      if(!docu.exists()) return null;
      return { id: docu.id, ...docu.data() };
    },

    async registrarNegocio(nombre, correo, passPlain){
      if(!nombre || !correo || !passPlain) throw new Error('Faltan datos');
      const exist = await this.getNegocioByEmail(correo);
      if(exist) throw new Error('Ese correo ya está registrado');
      const passHash = await sha256(passPlain);
      const nuevo = {
        nombre, correo, passwordHash: passHash,
        usuarios: [
          { usuario:'admin', passwordHash: passHash, rol:'administrador' },
          { usuario:'cajero', passwordHash: '', rol:'cajero' }
        ],
        productos: [], ventas: [], auditoria: [], caja: { abierta:false, saldoInicial:0, movimientos:[] }
      };
      const ref = await FB.addDoc(FB.collection(FB.db, 'negocios'), nuevo);
      return ref.id;
    },

    // Usuarios
    async setUsuarios(negId, usuarios){
      const neg = await this.getNegocioById(negId);
      if(!neg) throw new Error('Negocio no encontrado');
      neg.usuarios = usuarios;
      await FB.setDoc(FB.doc(FB.db, 'negocios', negId), neg);
      return true;
    },

    // Productos
    async listProductos(negId, filtro=''){
      const neg = await this.getNegocioById(negId);
      if(!neg) return [];
      const f = filtro.trim().toLowerCase();
      const arr = (neg.productos||[]);
      return arr.filter(p => !f || p.codigo.toLowerCase().includes(f) || p.nombre.toLowerCase().includes(f));
    },
    async setProductos(negId, productos){
      const neg = await this.getNegocioById(negId);
      if(!neg) throw new Error('Negocio no encontrado');
      neg.productos = productos;
      await FB.setDoc(FB.doc(FB.db, 'negocios', negId), neg);
      return true;
    },

    // Caja y ventas
    async setCaja(negId, caja){
      const neg = await this.getNegocioById(negId);
      neg.caja = caja;
      await FB.setDoc(FB.doc(FB.db, 'negocios', negId), neg);
    },
    async addVenta(negId, venta, productosActualizados, movCaja){
      const neg = await this.getNegocioById(negId);
      neg.ventas = (neg.ventas||[]); neg.ventas.push(venta);
      if(productosActualizados) neg.productos = productosActualizados;
      neg.caja = neg.caja || { abierta:false, saldoInicial:0, movimientos:[] };
      if(movCaja) neg.caja.movimientos.push(movCaja);
      await FB.setDoc(FB.doc(FB.db, 'negocios', negId), neg);
    }
  };

  window.Storage = Storage;
})();