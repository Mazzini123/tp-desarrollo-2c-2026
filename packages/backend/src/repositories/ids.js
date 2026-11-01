// Un ObjectId de Mongo escrito como texto: 24 caracteres hexadecimales.
//
// Los repositorios lo chequean antes de consultar: un id con otro formato no
// puede existir, asi que la busqueda devuelve null (y el service responde
// 404, igual que con un id que no esta) en vez de que Mongoose tire un
// CastError. mongoose.isValidObjectId no sirve para esto: acepta cualquier
// texto de 12 caracteres.
const OBJECT_ID = /^[a-f\d]{24}$/i;

export function esIdValido(id) {
  return typeof id === "string" ? OBJECT_ID.test(id) : Boolean(id);
}
