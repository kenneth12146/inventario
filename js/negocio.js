// js/negocio.js - Gestión de negocios con seguridad

console.log("🧩 negocio.js cargado correctamente");

window.Negocio = {
  async registrarNegocio(nombre, correo, password) {
    console.log("➡️ registrarNegocio() llamado con:", nombre, correo);

    try {
      // Validar Firebase
      if (!window.FB || !window.FB.db) {
        throw new Error("Firebase no inicializado correctamente");
      }

      const { db, collection, addDoc, query, where, getDocs } = window.FB;

      // Validar campos obligatorios
      if (!nombre || !correo || !password) {
        throw new Error("Todos los campos son obligatorios");
      }

      // Validar formato de correo
      if (!Utils.isValidEmail(correo)) {
        throw new Error("Formato de correo inválido");
      }

      // Validar fortaleza de contraseña
      if (!Utils.isStrongPassword(password)) {
        throw new Error("La contraseña debe tener al menos 8 caracteres");
      }

      // Comprobar si ya existe un negocio con ese correo
      console.log("🔎 Verificando disponibilidad del correo...");
      const q = query(collection(db, "negocios"), where("correo", "==", correo));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        throw new Error("Ya existe un negocio registrado con este correo");
      }

      // Hash de la contraseña
      const passwordHash = await Utils.hashPassword(password);

      // Datos del nuevo negocio
      const nuevoNegocio = {
        nombre,
        correo,
        passwordHash, // Contraseña hasheada
        fechaCreacion: new Date().toISOString(),
        usuarios: [
          { 
            usuario: "admin", 
            passwordHash: passwordHash, 
            rol: "administrador",
            activo: true 
          },
          { 
            usuario: "cajero1", 
            passwordHash: passwordHash, 
            rol: "cajero",
            activo: true 
          }
        ],
        productos: [],
        ventas: [],
        auditoria: [],
        configuracion: {
          iva: 19,
          moneda: "COP",
          alertaStockMinimo: 5
        },
        caja: { 
          abierta: false, 
          saldoInicial: 0, 
          movimientos: [] 
        }
      };

      console.log("💾 Guardando nuevo negocio...");
      const ref = await addDoc(collection(db, "negocios"), nuevoNegocio);

      console.log("✅ Negocio creado con ID:", ref.id);

      // Registrar en auditoría
      await this.registrarAuditoria(ref.id, "REGISTRO", "Negocio creado");

      return ref.id;

    } catch (err) {
      console.error("❌ Error en registrarNegocio:", err);
      throw err;
    }
  },

  async registrarAuditoria(negocioId, accion, descripcion) {
    try {
      const { db, doc, getDoc, updateDoc } = window.FB;
      const negocioRef = doc(db, "negocios", negocioId);
      const negocioSnap = await getDoc(negocioRef);

      if (!negocioSnap.exists()) return;

      const data = negocioSnap.data();
      const auditoria = data.auditoria || [];

      auditoria.push({
        accion,
        descripcion,
        timestamp: Date.now(),
        fecha: new Date().toISOString()
      });

      await updateDoc(negocioRef, { auditoria });
      console.log("📝 Auditoría registrada:", accion);

    } catch (err) {
      console.error("Error al registrar auditoría:", err);
    }
  }
};
