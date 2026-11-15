export async function exigirReferencia(modelo, id, descripcion) {
  if (!id || !(await modelo.exists({ _id: id }))) {
    throw new Error(`Referencia invalida: no existe ${descripcion} con id ${id}`);
  }
}
