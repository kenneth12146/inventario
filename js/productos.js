// js/productos.js — manejo de inventario en Firestore
console.log("🧩 productos.js cargado");

window.Productos = {
  async agregarProducto(negocioId, producto) {
    try {
      const { db, collection, addDoc } = window.FB;
      const ref = await addDoc(collection(db, `negocios/${negocioId}/productos`), producto);
      console.log("✅ Producto agregado:", ref.id);
      return ref.id;
    } catch (err) {
      console.error("❌ Error al agregar producto:", err);
      throw err;
    }
  },

  async listarProductos(negocioId) {
    try {
      const { db, collection, getDocs } = window.FB;
      const snap = await getDocs(collection(db, `negocios/${negocioId}/productos`));
      const productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log("📦 Productos:", productos);
      return productos;
    } catch (err) {
      console.error("❌ Error al listar productos:", err);
      throw err;
    }
  }
};
