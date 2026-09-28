import { ColaboradorModel } from "../models/ColaboradorModel.js";
import { Colaborador } from "../domain/Colaborador.js";
import { MedioDeContacto } from "../domain/MedioDeContacto.js";

function aDocumento(colaborador) {
  return {
    _id: colaborador.id,
    nombreFantasia: colaborador.nombreFantasia,
    nombre: colaborador.nombre,
    apellido: colaborador.apellido,
    cuentaGit: colaborador.cuentaGit,
    presentacion: colaborador.presentacion,
    pronombres: colaborador.pronombres,
    recibeMensajeriaInterna: colaborador.recibeMensajeriaInterna,
    mediosDeContacto: colaborador.mediosDeContacto.map((medio) => ({
      tipo: medio.tipo,
      valor: medio.valor,
    })),
    // Solo los codigos: las habilidades viven en su propia coleccion.
    codigosHabilidades: colaborador.habilidades.map((habilidad) => habilidad.codigo),
  };
}

export class MongoColaboradorRepository {
  // Necesita el repo de habilidades para reconstruir las referencias.
  constructor({ habilidadRepository }) {
    this.habilidadRepository = habilidadRepository;
  }

  // Es async porque tiene que ir a buscar las habilidades referenciadas.
  async aDominio(documento) {
    if (!documento) {
      return null;
    }

    const colaborador = new Colaborador({
      id: documento._id,
      nombreFantasia: documento.nombreFantasia,
      nombre: documento.nombre,
      apellido: documento.apellido,
      cuentaGit: documento.cuentaGit,
      presentacion: documento.presentacion,
      recibeMensajeriaInterna: documento.recibeMensajeriaInterna,
    });

    colaborador.pronombres = documento.pronombres ?? [];

    colaborador.mediosDeContacto = (documento.mediosDeContacto ?? []).map(
      (medio) => new MedioDeContacto(medio),
    );

    const habilidades = await Promise.all(
      (documento.codigosHabilidades ?? []).map((codigo) =>
        this.habilidadRepository.buscarPorId(codigo),
      ),
    );

    // filter(Boolean) descarta las que ya no existen en el catalogo.
    colaborador.habilidades = habilidades.filter(Boolean);

    return colaborador;
  }

  async guardar(colaborador) {
    await ColaboradorModel.updateOne(
      { _id: colaborador.id },
      { $set: aDocumento(colaborador) },
      { upsert: true },
    );

    return colaborador;
  }

  async buscarPorId(id) {
    const documento = await ColaboradorModel.findById(id).lean();
    return this.aDominio(documento);
  }

  async listar() {
    const documentos = await ColaboradorModel.find().lean();
    return Promise.all(documentos.map((doc) => this.aDominio(doc)));
  }

  async listarPaginado(numeroPagina, limitePorPagina) {
    const salto = (numeroPagina - 1) * limitePorPagina;

    const [documentos, total] = await Promise.all([
      ColaboradorModel.find().skip(salto).limit(limitePorPagina).lean(),
      ColaboradorModel.countDocuments(),
    ]);

    return {
      items: await Promise.all(documentos.map((doc) => this.aDominio(doc))),
      total,
    };
  }
}