// js/auth.js - Autenticación mejorada con seguridad

console.log("🧩 auth.js cargado correctamente");

window.Auth = {
  // Duración de sesión: 24 horas
  SESSION_DURATION: 24 * 60 * 60 * 1000,

  async login(correo, password) {
    try {
      // Validar Firebase
      if (!window.FB || !window.FB.db) {
        throw new Error("Firebase no inicializado");
      }

      const { db, collection, query, where, getDocs } = window.FB;

      // Validar campos
      if (!correo || !password) {
        throw new Error("Correo y contraseña requeridos");
      }

      if (!Utils.isValidEmail(correo)) {
        throw new Error("Formato de correo inválido");
      }

      console.log("🔎 Buscando negocio con correo:", correo);

      // Buscar negocio
      const q = query(collection(db, "negocios"), where("correo", "==", correo));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error("No existe una cuenta con ese correo");
      }

      const negocio = snapshot.docs[0].data();
      const negocioId = snapshot.docs[0].id;

      console.log("🧩 Negocio encontrado:", negocio.nombre);

      // Comparar contraseña hasheada
      const passwordHash = await Utils.hashPassword(password);
      
      if (negocio.passwordHash !== passwordHash) {
        throw new Error("Contraseña incorrecta");
      }

      // Crear sesión
      const session = {
        id: negocioId,
        nombre: negocio.nombre,
        correo: negocio.correo,
        rol: "administrador",
        timestamp: Date.now(),
        expiresAt: Date.now() + this.SESSION_DURATION
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
    window.location.href = "/login.html";
  },

  getSesion() {
    try {
      const data = localStorage.getItem("sesion_negocio");
      if (!data) return null;

      const session = JSON.parse(data);

      // Verificar si la sesión expiró
      if (session.expiresAt && Date.now() > session.expiresAt) {
        console.warn("⚠️ Sesión expirada");
        this.logout();
        return null;
      }

      return session;
    } catch (err) {
      console.error("Error al obtener sesión:", err);
      return null;
    }
  },

  // Verificar si hay sesión activa
  isAuthenticated() {
    return this.getSesion() !== null;
  },

  // Middleware para proteger páginas
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = "/login.html";
    }
  }
};
