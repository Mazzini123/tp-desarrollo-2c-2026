export function aplicarFormatoJSON(schema, { campos, transformar } = {}) {
  if (!Array.isArray(campos) || campos.length === 0) {
    throw new Error("aplicarFormatoJSON necesita la lista de campos visibles");
  }
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform(documento, salida) {
      const visible = {};
      for (const campo of campos) {
        if (campo in salida) visible[campo] = salida[campo];
      }
      transformar?.(documento, visible);
      return visible;
    },
  });
}
