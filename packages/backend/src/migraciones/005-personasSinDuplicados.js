import mongoose from "mongoose";

function quitarRepetidos(lista, identificar) {
  const vistos = new Set();
  const unicos = [];
  for (const elemento of lista) {
    const clave = identificar(elemento);
    if (!vistos.has(clave)) {
      vistos.add(clave);
      unicos.push(elemento);
    }
  }
  return unicos;
}

export async function migrarPersonasSinDuplicados() {
  const coleccion = mongoose.connection.collection("colaboradors");
  let corregidas = 0;
  for await (const persona of coleccion.find({})) {
    const habilidades = quitarRepetidos(persona.habilidades ?? [], (h) => h.codigo);
    const pronombres = quitarRepetidos(persona.pronombres ?? [], (p) => p);
    const mediosDeContacto = quitarRepetidos(
      persona.mediosDeContacto ?? [],
      (m) => m.tipo + ":" + m.valor,
    );
    const hayRepetidos =
      habilidades.length !== (persona.habilidades ?? []).length ||
      pronombres.length !== (persona.pronombres ?? []).length ||
      mediosDeContacto.length !== (persona.mediosDeContacto ?? []).length;
    if (!hayRepetidos) continue;

    const resultado = await coleccion.updateOne(
      {
        _id: persona._id,
        __v: persona.__v ?? { $exists: false },
        habilidades: persona.habilidades ?? { $exists: false },
        pronombres: persona.pronombres ?? { $exists: false },
        mediosDeContacto: persona.mediosDeContacto ?? { $exists: false },
      },
      { $set: { habilidades, pronombres, mediosDeContacto }, $inc: { __v: 1 } },
    );
    if (!resultado.matchedCount)
      throw new Error(
        "Una persona cambió durante la migración 005; reintentar el arranque",
      );
    corregidas++;
  }
  return { corregidas };
}
