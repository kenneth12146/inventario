// js/auth.js — manejo de inicio de sesión
console.log("🧩 auth.js cargado correctamente");

window.Auth = {
  async login(correo, password) {
    try {
      if (!window.FB || !window.FB.db) {
        throw new Error("Firebase no inicializado");
      }

      const { db, collection, query, where, getDocs } = window.FB;

      if (!correo || !password) throw new Error("Correo y contraseña requeridos");

      console.log("🔎 Buscando negocio con correo:", correo);
      const q = query(collection(db, "negocios"), where("correo", "==", correo));
      const snapshot = await getDocs(q);

      if (snapshot.empty) throw new Error("No existe una cuenta con ese correo");

      const negocio = snapshot.docs[0].data();
      console.log("🧩 Negocio encontrado:", negocio.nombre);

      // Comparar contraseña
      if (negocio.passwordHash !== password) {
        throw new Error("Contraseña incorrecta");
      }

      // Guardar sesión en localStorage
      const session = {
        id: snapshot.docs[0].id,
        nombre: negocio.nombre,
        correo: negocio.correo,
        rol: "administrador",
        timestamp: Date.now()
      };
      localStorage.setItem("sesion_negocio", JSON.stringify(session));
      console.log("✅ Sesión iniciada correctamente");

      return session;

    } catch (err) {
      console.error("❌ Error al iniciar sesión:", err);
      throw err;
    }
  },

  logout() {
    localStorage.removeItem("sesion_negocio");
    console.log("👋 Sesión cerrada");
  },

  getSesion() {
    const data = localStorage.getItem("sesion_negocio");
    return data ? JSON.parse(data) : null;
  }
};
