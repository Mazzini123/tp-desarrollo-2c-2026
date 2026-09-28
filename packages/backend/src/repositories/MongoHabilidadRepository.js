import { HabilidadModel } from "../models/HabilidadModel.js";
import { Habilidad } from "../domain/Habilidad.js";

// --- Traduccion dominio -> documento ---
function aDocumento(habilidad) {
  return {
    _id: habilidad.codigo,
    titulo: habilidad.titulo,
    descripcion: habilidad.descripcion,
    fechaCreacion: habilidad.fechaCreacion,
    usuario: habilidad.usuario,
    activo: habilidad.activo,
  };
}

// --- Traduccion documento -> dominio ---
// Reconstruye la CLASE, para que vuelvan los metodos (equals, activar...).
function aDominio(documento) {
  if (!documento) {
    return null;
  }

  return new Habilidad({
    titulo: documento.titulo,
    descripcion: documento.descripcion,
    fechaCreacion: documento.fechaCreacion,
    usuario: documento.usuario,
    activo: documento.activo,
  });
}

export class MongoHabilidadRepository {
  async guardar(habilidad) {
    // upsert: si existe lo actualiza, si no lo crea.
    await HabilidadModel.updateOne(
      { _id: habilidad.codigo },
      { $set: aDocumento(habilidad) },
      { upsert: true },
    );

    return habilidad;
  }

  async buscarPorId(codigo) {
    const documento = await HabilidadModel.findById(codigo).lean();
    return aDominio(documento);
  }

  async listar() {
    const documentos = await HabilidadModel.find().lean();
    return documentos.map(aDominio);
  }

  async listarPaginado(numeroPagina, limitePorPagina) {
    const salto = (numeroPagina - 1) * limitePorPagina;

    // Las dos consultas son independientes: las lanzamos en paralelo.
    const [documentos, total] = await Promise.all([
      HabilidadModel.find().skip(salto).limit(limitePorPagina).lean(),
      HabilidadModel.countDocuments(),
    ]);

    return { items: documentos.map(aDominio), total };
  }

  async existeCodigo(codigo) {
    return (await HabilidadModel.exists({ _id: codigo })) !== null;
  }
}