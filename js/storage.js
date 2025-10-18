// js/storage.js
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { app } from "./firebase.js";
const db = getFirestore(app);

// Utilidad para obtener el ID del negocio actual
function negocioID() {
  const sesion = JSON.parse(localStorage.getItem("sesion_negocio") || "{}");
  return sesion.id || null;
}

// ===================== PRODUCTOS =====================

// Guardar un nuevo producto
export async function agregarProducto(producto) {
  const idNeg = negocioID();
  if (!idNeg) throw new Error("No hay negocio activo.");
  const ref = collection(db, `negocios/${idNeg}/productos`);
  await addDoc(ref, producto);
}

// Editar un producto existente
export async function editarProducto(id, producto) {
  const idNeg = negocioID();
  if (!idNeg) throw new Error("No hay negocio activo.");
  const ref = doc(db, `negocios/${idNeg}/productos/${id}`);
  await updateDoc(ref, producto);
}

// Eliminar un producto
export async function eliminarProducto(id) {
  const idNeg = negocioID();
  if (!idNeg) throw new Error("No hay negocio activo.");
  const ref = doc(db, `negocios/${idNeg}/productos/${id}`);
  await deleteDoc(ref);
}

// ===================== USUARIOS =====================

export async function agregarUsuario(usuario) {
  const idNeg = negocioID();
  const ref = doc(db, "negocios", idNeg);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Negocio no encontrado");
  const data = snap.data();
  const usuarios = data.usuarios || [];
  usuarios.push(usuario);
  await updateDoc(ref, { usuarios });
}

// ===================== VENTAS =====================

export async function registrarVenta(venta) {
  const idNeg = negocioID();
  const ref = collection(db, `negocios/${idNeg}/ventas`);
  await addDoc(ref, venta);
}

// ===================== CAJA =====================

export async function actualizarCaja(data) {
  const idNeg = negocioID();
  const ref = doc(db, "negocios", idNeg);
  await updateDoc(ref, { caja: data });
}

// ===================== EXPORTAR / IMPORTAR =====================

export async function obtenerTodo() {
  const idNeg = negocioID();
  const ref = doc(db, "negocios", idNeg);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
