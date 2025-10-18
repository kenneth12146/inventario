// js/negocio.js
// Gestión del registro y datos de negocios en Firestore

console.log("🧩 negocio.js cargado correctamente");

window.Negocio = {
  async registrarNegocio(nombre, correo, password) {
    console.log("➡️ registrarNegocio() llamado con:", nombre, correo);
    try {
      if (!window.FB || !window.FB.db) {
        throw new Error("Firebase no inicializado correctamente");
      }

      const { db, collection, addDoc, query, where, getDocs } = window.FB;

      if (!nombre || !correo || !password) {
        throw new Error("Todos los campos son obligatorios");
      }

      // Comprobar si ya existe un negocio con ese correo
      console.log("🔎 Buscando negocio existente...");
      const q = query(collection(db, "negocios"), where("correo", "==", correo));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        throw new Error("Ya existe un negocio con este correo");
      }

      // Datos a guardar
      const nuevoNegocio = {
        nombre,
        correo,
        passwordHash: password, // En prod, cifrarlo
        fechaCreacion: new Date().toISOString(),
        usuarios: [
          { usuario: "admin", passwordHash: password, rol: "administrador" },
          { usuario: "cajero1", passwordHash: password, rol: "cajero" }
        ],
        productos: [],
        ventas: [],
        auditoria: [],
        caja: { abierta: false, saldoInicial: 0, movimientos: [] }
      };

      console.log("💾 Guardando nuevo negocio...");
      const ref = await addDoc(collection(db, "negocios"), nuevoNegocio);
      console.log("✅ Negocio creado con ID:", ref.id);
      return ref.id;

    } catch (err) {
      console.error("❌ Error en registrarNegocio:", err);
      throw err;
    }
  }
};
