 // ========================================
//  STORAGE.JS - GESTIÓN COMPLETA DE DATOS
//  CON DEVOLUCIONES FUNCIONANDO
// ========================================


console.log("🗄️ storage.js cargando...");


window.Storage = {

  negocioID() {
    const sesion = Auth.getSesion();
    if (!sesion || !sesion.id) throw new Error("No hay sesión activa");
    return sesion.id;
  },


  // ========== PRODUCTOS ==========
  async agregarProducto(producto) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, addDoc } = window.FB;
      if (!producto.nombre || !producto.codigo) throw new Error("Nombre y código obligatorios");
      if (producto.cantidad < 0 || producto.precioVenta < 0) throw new Error("Cantidad y precio deben ser positivos");
      const ref = collection(db, `negocios/${idNeg}/productos`);
      const docRef = await addDoc(ref, { ...producto, fechaCreacion: Date.now() });
      console.log("✅ Producto agregado:", docRef.id);
      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "PRODUCTO_NUEVO", `Producto: ${producto.nombre}`);
      }
      return docRef.id;
    } catch (err) {
      console.error("Error al agregar producto:", err);
      throw err;
    }
  },


  async editarProducto(id, producto) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, updateDoc } = window.FB;
      const ref = doc(db, `negocios/${idNeg}/productos`, id);
      await updateDoc(ref, { ...producto, fechaModificacion: Date.now() });
      console.log("✅ Producto editado:", id);
      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "PRODUCTO_EDITADO", `ID: ${id}`);
      }
    } catch (err) {
      console.error("Error al editar producto:", err);
      throw err;
    }
  },


  async eliminarProducto(id) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, deleteDoc } = window.FB;
      const ref = doc(db, `negocios/${idNeg}/productos`, id);
      await deleteDoc(ref);
      console.log("✅ Producto eliminado:", id);
      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "PRODUCTO_ELIMINADO", `ID: ${id}`);
      }
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      throw err;
    }
  },


  escucharProductos(callback) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, onSnapshot } = window.FB;
      console.log("👂 Configurando listener para productos...");
      const ref = collection(db, `negocios/${idNeg}/productos`);
      return onSnapshot(ref, (snapshot) => {
        console.log("📦 Productos actualizados desde Firebase:", snapshot.docs.length);
        const productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(productos);
      }, (error) => {
        console.error("❌ Error en listener de productos:", error);
      });
    } catch (err) {
      console.error("❌ Error al configurar listener:", err);
      return () => {};
    }
  },


  // ========== VENTAS ==========
  async registrarVenta(venta) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, addDoc } = window.FB;
      if (!venta.items || venta.items.length === 0) throw new Error("La venta debe tener al menos un producto");
      if (venta.total <= 0) throw new Error("El total debe ser mayor a cero");

      const ventaCompleta = {
        ...venta,
        id: venta.id || `V${Date.now()}`,
        timestamp: Date.now(),
        fecha: new Date().toISOString(),
        usuario: Auth.getSesion()?.nombre || "Sistema",
        synced: true
      };

      const ref = collection(db, `negocios/${idNeg}/ventas`);
      await addDoc(ref, ventaCompleta);
      console.log("✅ Venta registrada:", ventaCompleta.id);

      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "VENTA_REGISTRADA", `Total: ${venta.total}`);
      }

      return ventaCompleta.id;
    } catch (err) {
      console.error("Error al registrar venta:", err);
      throw err;
    }
  },


  escucharVentas(callback) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, onSnapshot, query, orderBy } = window.FB;
      console.log("👂 Configurando listener para ventas...");
      const ref = collection(db, `negocios/${idNeg}/ventas`);
      const q = query(ref, orderBy('timestamp', 'desc'));
      return onSnapshot(q, (snapshot) => {
        console.log("💳 Ventas actualizadas desde Firebase:", snapshot.docs.length);
        const ventas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(ventas);
      }, (error) => {
        console.error("❌ Error en listener de ventas:", error);
      });
    } catch (err) {
      console.error("❌ Error al configurar listener de ventas:", err);
      return () => {};
    }
  },


  // ========== DEVOLUCIONES (NUEVO) ==========
  async registrarDevolucion(devolucion) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, addDoc } = window.FB;

      if (!devolucion.items || devolucion.items.length === 0) {
        throw new Error("La devolución debe tener al menos un producto");
      }

      const devolucionCompleta = {
        ...devolucion,
        id: devolucion.id || `DEV${Date.now()}`,
        timestamp: Date.now(),
        fecha: new Date().toISOString(),
        usuario: Auth.getSesion()?.nombre || "Sistema",
        synced: true
      };

      const ref = collection(db, `negocios/${idNeg}/devoluciones`);
      await addDoc(ref, devolucionCompleta);
      console.log("✅ Devolución registrada:", devolucionCompleta.id);

      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "DEVOLUCION_REGISTRADA", `Total: ${devolucion.total}`);
      }

      return devolucionCompleta.id;
    } catch (err) {
      console.error("Error al registrar devolución:", err);
      throw err;
    }
  },


  escucharDevoluciones(callback) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, onSnapshot, query, orderBy } = window.FB;
      console.log("👂 Configurando listener para devoluciones...");
      const ref = collection(db, `negocios/${idNeg}/devoluciones`);
      const q = query(ref, orderBy('timestamp', 'desc'));
      return onSnapshot(q, (snapshot) => {
        console.log("🔄 Devoluciones actualizadas desde Firebase:", snapshot.docs.length);
        const devoluciones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(devoluciones);
      }, (error) => {
        console.error("❌ Error en listener de devoluciones:", error);
      });
    } catch (err) {
      console.error("❌ Error al configurar listener de devoluciones:", err);
      return () => {};
    }
  },


  async getDevoluciones() {
    try {
      const idNeg = this.negocioID();
      const { db, collection, getDocs, query, orderBy } = window.FB;
      const ref = collection(db, `negocios/${idNeg}/devoluciones`);
      const q = query(ref, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Error al obtener devoluciones:", err);
      return [];
    }
  },


  // ========== CLIENTES ==========
  async agregarCliente(cliente) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, addDoc, query, where, getDocs } = window.FB;

      // Verificar si ya existe un cliente con esa cédula
      if (cliente.cedula) {
        const q = query(
          collection(db, `negocios/${idNeg}/clientes`),
          where('cedula', '==', cliente.cedula)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          throw new Error('Ya existe un cliente con esa cédula');
        }
      }

      const ref = collection(db, `negocios/${idNeg}/clientes`);
      const docRef = await addDoc(ref, {
        ...cliente,
        fechaRegistro: Date.now(),
        totalCompras: 0,
        ultimaCompra: null,
        totalGastado: 0
      });

      console.log('✅ Cliente agregado:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('Error al agregar cliente:', err);
      throw err;
    }
  },


  async editarCliente(id, datosCliente) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, updateDoc } = window.FB;
      const ref = doc(db, `negocios/${idNeg}/clientes`, id);
      await updateDoc(ref, { ...datosCliente, fechaModificacion: Date.now() });
      console.log('✅ Cliente actualizado:', id);
    } catch (err) {
      console.error('Error al editar cliente:', err);
      throw err;
    }
  },


  async eliminarCliente(id) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, deleteDoc } = window.FB;
      const ref = doc(db, `negocios/${idNeg}/clientes`, id);
      await deleteDoc(ref);
      console.log('✅ Cliente eliminado:', id);
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      throw err;
    }
  },


  escucharClientes(callback) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, onSnapshot } = window.FB;
      console.log('👂 Configurando listener para clientes...');
      const ref = collection(db, `negocios/${idNeg}/clientes`);
      return onSnapshot(ref, (snapshot) => {
        console.log('👥 Clientes actualizados:', snapshot.docs.length);
        const clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(clientes);
      }, (error) => {
        console.error('❌ Error en listener de clientes:', error);
      });
    } catch (err) {
      console.error('❌ Error al configurar listener de clientes:', err);
      return () => {};
    }
  },


  async getClientes() {
    try {
      const idNeg = this.negocioID();
      const { db, collection, getDocs } = window.FB;
      const ref = collection(db, `negocios/${idNeg}/clientes`);
      const snapshot = await getDocs(ref);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error al obtener clientes:', err);
      return [];
    }
  },


  // 🔥 FUNCIONES NUEVAS DE CLIENTES
  async buscarClientePorCedula(cedula) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, query, where, getDocs } = window.FB;

      const q = query(
        collection(db, `negocios/${idNeg}/clientes`),
        where('cedula', '==', cedula)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (err) {
      console.error('Error al buscar cliente:', err);
      return null;
    }
  },


  async actualizarEstadisticasCliente(clienteId, montoCompra) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, getDoc, updateDoc, increment } = window.FB;

      const clienteRef = doc(db, `negocios/${idNeg}/clientes`, clienteId);
      const clienteDoc = await getDoc(clienteRef);

      if (clienteDoc.exists()) {
        await updateDoc(clienteRef, {
          totalCompras: increment(1),
          totalGastado: increment(montoCompra),
          ultimaCompra: Date.now()
        });
        console.log('✅ Estadísticas del cliente actualizadas');
      }
    } catch (err) {
      console.error('Error al actualizar estadísticas:', err);
    }
  },


  // ========== USUARIOS ==========
  async agregarUsuario(usuario) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, addDoc } = window.FB;
      if (!usuario.nombre || !usuario.email) throw new Error("Nombre y email son obligatorios");

      const ref = collection(db, `negocios/${idNeg}/usuarios`);
      const docRef = await addDoc(ref, {
        ...usuario,
        fechaCreacion: Date.now(),
        activo: true
      });
      console.log("✅ Usuario agregado:", docRef.id);

      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "USUARIO_NUEVO", `Usuario: ${usuario.nombre}`);
      }

      return docRef.id;
    } catch (err) {
      console.error("Error al agregar usuario:", err);
      throw err;
    }
  },


  async editarUsuario(id, usuario) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, updateDoc } = window.FB;
      const ref = doc(db, `negocios/${idNeg}/usuarios`, id);
      await updateDoc(ref, { ...usuario, fechaModificacion: Date.now() });
      console.log("✅ Usuario editado:", id);

      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "USUARIO_EDITADO", `ID: ${id}`);
      }
    } catch (err) {
      console.error("Error al editar usuario:", err);
      throw err;
    }
  },


  async eliminarUsuario(id) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, deleteDoc } = window.FB;
      const ref = doc(db, `negocios/${idNeg}/usuarios`, id);
      await deleteDoc(ref);
      console.log("✅ Usuario eliminado:", id);

      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "USUARIO_ELIMINADO", `ID: ${id}`);
      }
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      throw err;
    }
  },


  escucharUsuarios(callback) {
    try {
      const idNeg = this.negocioID();
      const { db, collection, onSnapshot } = window.FB;
      console.log("👂 Configurando listener para usuarios...");
      const ref = collection(db, `negocios/${idNeg}/usuarios`);
      return onSnapshot(ref, (snapshot) => {
        console.log("👥 Usuarios actualizados desde Firebase:", snapshot.docs.length);
        const usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(usuarios);
      }, (error) => {
        console.error("❌ Error en listener de usuarios:", error);
      });
    } catch (err) {
      console.error("❌ Error al configurar listener de usuarios:", err);
      return () => {};
    }
  },


  // ========== CATEGORÍAS ==========
  async actualizarCategorias(categorias) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, updateDoc } = window.FB;
      const ref = doc(db, "negocios", idNeg);
      await updateDoc(ref, { categorias: categorias });
      console.log("✅ Categorías actualizadas:", categorias);

      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "CATEGORIAS_ACTUALIZADAS", `Total: ${categorias.length}`);
      }
    } catch (err) {
      console.error("Error al actualizar categorías:", err);
      throw err;
    }
  },


  // ========== CAJA ==========
  async actualizarCaja(dataCaja) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, updateDoc } = window.FB;
      const ref = doc(db, "negocios", idNeg);
      await updateDoc(ref, { caja: dataCaja });
      console.log("✅ Caja actualizada");

      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "CAJA_ACTUALIZADA", dataCaja.abierta ? "Apertura" : "Cierre");
      }
    } catch (err) {
      console.error("Error al actualizar caja:", err);
      throw err;
    }
  },


  // ========== SUBIR IMÁGENES A IMGUR ==========
  async subirImagenImgur(file) {
    try {
      console.log("📤 Subiendo imagen a Imgur...");
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;
      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Image, type: 'base64' })
      });

      if (!response.ok) throw new Error('Error al subir imagen a Imgur');

      const data = await response.json();
      const imageUrl = data.data.link;
      console.log("✅ Imagen subida exitosamente a Imgur:", imageUrl);
      return imageUrl;
    } catch (err) {
      console.error("❌ Error al subir imagen a Imgur:", err);
      console.warn("⚠️ Usando base64 como fallback");
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }
  },


  // ========== CONFIGURACIÓN ==========
  async actualizarConfiguracion(config) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, updateDoc } = window.FB;
      const ref = doc(db, "negocios", idNeg);
      await updateDoc(ref, config);
      console.log("✅ Configuración actualizada");

      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "CONFIG_ACTUALIZADA", "");
      }
    } catch (err) {
      console.error("Error al actualizar configuración:", err);
      throw err;
    }
  },


  async actualizarConfiguracionCompleta(config) {
    try {
      const idNeg = this.negocioID();
      const { db, doc, updateDoc } = window.FB;
      const ref = doc(db, "negocios", idNeg);
      await updateDoc(ref, {
        nombre: config.nombre,
        nit: config.nit || '',
        telefono: config.telefono || '',
        email: config.email || '',
        direccion: config.direccion || '',
        ciudad: config.ciudad || '',
        logo: config.logo || '',
        fechaModificacion: Date.now()
      });
      console.log("✅ Configuración actualizada completamente");

      if (typeof Negocio !== 'undefined' && Negocio.registrarAuditoria) {
        await Negocio.registrarAuditoria(idNeg, "CONFIG_COMPLETA_ACTUALIZADA", "");
      }
    } catch (err) {
      console.error("Error al actualizar configuración completa:", err);
      throw err;
    }
  },


  // ========== OBTENER DATOS ==========
  async getNegocioById(id) {
    try {
      const { db, doc, getDoc } = window.FB;
      const ref = doc(db, "negocios", id);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      console.error("Error al obtener negocio:", err);
      return null;
    }
  },


  async getProductos() {
    try {
      const idNeg = this.negocioID();
      const { db, collection, getDocs } = window.FB;
      const ref = collection(db, `negocios/${idNeg}/productos`);
      const snapshot = await getDocs(ref);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Error al obtener productos:", err);
      return [];
    }
  },


  async getVentas() {
    try {
      const idNeg = this.negocioID();
      const { db, collection, getDocs, query, orderBy } = window.FB;
      const ref = collection(db, `negocios/${idNeg}/ventas`);
      const q = query(ref, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Error al obtener ventas:", err);
      return [];
    }
  },


  async getUsuarios() {
    try {
      const idNeg = this.negocioID();
      const { db, collection, getDocs } = window.FB;
      const ref = collection(db, `negocios/${idNeg}/usuarios`);
      const snapshot = await getDocs(ref);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      return [];
    }
  },


  // ========== IMPORTAR CSV ==========
  async importarCSV(file) {
    if (!file) throw new Error("No se seleccionó ningún archivo");

    console.log("📤 Iniciando importación de CSV...");
    const text = await file.text();
    const lines = text.split('\n');
    const startIndex = lines[0].toLowerCase().includes('codigo') || lines[0].toLowerCase().includes('nombre') ? 1 : 0;

    let importados = 0;
    let errores = 0;
    let nuevasCategorias = new Set();

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length < 4) {
        console.warn('⚠️ Línea inválida:', line);
        errores++;
        continue;
      }

      try {
        const producto = {
          codigo: parts[0].trim(),
          nombre: parts[1].trim(),
          categoria: parts[2]?.trim().toUpperCase() || '',
          cantidad: parseInt(parts[3]) || 0,
          precioCompra: parseFloat(parts[4]) || 0,
          precioVenta: parseFloat(parts[5]) || 0
        };

        await this.agregarProducto(producto);

        if (producto.categoria) {
          nuevasCategorias.add(producto.categoria);
        }

        importados++;
        console.log(`✅ Producto ${importados} importado:`, producto.nombre);
      } catch (err) {
        console.error('❌ Error en línea', i + 1, ':', err);
        errores++;
      }
    }

    if (nuevasCategorias.size > 0) {
      console.log("🏷️ Actualizando categorías...");
      const idNeg = this.negocioID();
      const negocio = await this.getNegocioById(idNeg);
      const categoriasExistentes = new Set(negocio?.categorias || []);
      nuevasCategorias.forEach(cat => categoriasExistentes.add(cat));
      await this.actualizarCategorias(Array.from(categoriasExistentes));
      console.log('✅ Categorías actualizadas:', Array.from(categoriasExistentes));
    }

    console.log(`✅ Importación completa: ${importados} productos, ${errores} errores`);
    return { importados, errores };
  },


  // ========== BACKUP Y RESTAURACIÓN ==========
  async crearBackup() {
    try {
      const idNeg = this.negocioID();
      const productos = await this.getProductos();
      const ventas = await this.getVentas();
      const usuarios = await this.getUsuarios();
      const negocio = await this.getNegocioById(idNeg);

      const backup = {
        version: '1.0',
        fecha: Date.now(),
        fechaLegible: new Date().toLocaleString('es-CO'),
        negocio: {
          nombre: negocio?.nombre || 'Mi Negocio',
          nit: negocio?.nit || '',
          categorias: negocio?.categorias || [],
          logo: negocio?.logo || ''
        },
        productos: productos,
        ventas: ventas.slice(0, 1000),
        usuarios: usuarios
      };

      console.log('✅ Backup creado:', backup);
      return backup;
    } catch (err) {
      console.error('Error al crear backup:', err);
      throw err;
    }
  },


  async restaurarBackup(backupData) {
    try {
      if (!backupData || !backupData.productos) throw new Error('Backup inválido');

      console.log('📥 Restaurando backup...');

      for (const producto of backupData.productos) {
        await this.agregarProducto(producto);
      }

      if (backupData.negocio?.categorias) {
        await this.actualizarCategorias(backupData.negocio.categorias);
      }

      if (backupData.usuarios && backupData.usuarios.length > 0) {
        for (const usuario of backupData.usuarios) {
          await this.agregarUsuario(usuario);
        }
      }

      console.log('✅ Backup restaurado correctamente');
      return true;
    } catch (err) {
      console.error('Error al restaurar backup:', err);
      throw err;
    }
  },


  // ========== ESTADÍSTICAS ==========
  async getEstadisticas() {
    try {
      const productos = await this.getProductos();
      const ventas = await this.getVentas();
      const hoy = new Date().setHours(0, 0, 0, 0);
      const ventasHoy = ventas.filter(v => v.timestamp >= hoy);
      const totalHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
      const stockBajo = productos.filter(p => p.cantidad <= 5).length;

      return {
        totalProductos: productos.length,
        stockBajo: stockBajo,
        ventasHoy: ventasHoy.length,
        totalVendidoHoy: totalHoy
      };
    } catch (err) {
      console.error('Error al obtener estadísticas:', err);
      return {
        totalProductos: 0,
        stockBajo: 0,
        ventasHoy: 0,
        totalVendidoHoy: 0
      };
    }
  }
};


console.log("✅ Storage.js listo COMPLETO con DEVOLUCIONES y CLIENTES");
