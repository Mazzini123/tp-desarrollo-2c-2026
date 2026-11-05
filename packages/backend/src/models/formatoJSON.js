export function aplicarFormatoJSON(schema, { ocultar = [], transformar } = {}) {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform(documento, salida) {
      delete salida._id;
      for (const campo of ocultar) {
        delete salida[campo];
      }
      transformar?.(documento, salida);
      return salida;
    },
  });
}
