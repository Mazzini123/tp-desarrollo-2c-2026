// Como se ve un documento cuando sale por la API (res.json llama a toJSON).
//
// - virtuals: true  → incluye `id` (el _id como string, lo arma Mongoose) y
//   los getters de las clases de dominio (que loadClass convierte en virtuals).
// - versionKey: false → el __v se guarda en la base, pero no se muestra.
// - transform → saca el _id (ya va como `id`) y los campos que nunca se
//   muestran, como los medios de contacto de una persona.
//
// Cada schema lo declara por su cuenta: Mongoose usa las opciones de toJSON
// del schema de CADA subdocumento, no las del documento que lo contiene.
export function aplicarFormatoJSON(schema, { ocultar = [] } = {}) {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform(_documento, salida) {
      delete salida._id;
      for (const campo of ocultar) {
        delete salida[campo];
      }
      return salida;
    },
  });
}
