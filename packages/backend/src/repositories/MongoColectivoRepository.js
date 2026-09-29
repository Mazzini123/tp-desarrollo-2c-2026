import { ColectivoModel } from "../models/ColectivoModel.js";
import { Colectivo } from "../domain/Colectivo.js";
import { Proyecto } from "../domain/Proyecto.js";
import { Perfil } from "../domain/Perfil.js";
import { Compromiso } from "../domain/Compromiso.js";
import { Colaboracion } from "../domain/Colaboracion.js";
import { Logro } from "../domain/Logro.js";
import { Ubicacion } from "../domain/Ubicacion.js";

// Orden estable para paginar: primero por fecha de alta, y el _id desempata.
const ORDEN = { createdAt: 1, _id: 1 };

// --- Traduccion dominio -> documento ---

function perfilADocumento(perfil) {
  return {
    _id: perfil.id,
    descripcion: perfil.descripcion,
    compromiso: {
      cantidadHoras: perfil.compromiso.cantidadHoras,
      periodo: perfil.compromiso.periodo,
    },
    modalidadColaboracion: perfil.modalidadColaboracion,
    // Solo los codigos: las habilidades viven en su propia coleccion.
    codigosHabilidadesRequeridas: perfil.habilidadesRequeridas.map((h) => h.codigo),
    codigosHabilidadesOpcionales: perfil.habilidadesOpcionales.map((h) => h.codigo),
  };
}

function colaboracionADocumento(colaboracion) {
  return {
    _id: colaboracion.id,
    // Solo el id: el colaborador vive en su propia coleccion.
    colaboradorId: colaboracion.colaborador.id,
    esPublica: colaboracion.esPublica,
    fecha: colaboracion.fecha,
  };
}

function proyectoADocumento(proyecto) {
  return {
    _id: proyecto.id,
    titulo: proyecto.titulo,
    descripcion: proyecto.descripcion,
    estado: proyecto.estado,
    porcentajeConcrecion: proyecto.porcentajeConcrecion,
    urlSistema: proyecto.urlSistema ?? null,
    urlRepositorio: proyecto.urlRepositorio ?? null,
    perfiles: proyecto.perfiles.map(perfilADocumento),
    colaboraciones: proyecto.colaboraciones.map(colaboracionADocumento),
    logros: proyecto.logros.map((logro) => ({
      titulo: logro.titulo,
      descripcion: logro.descripcion,
      fecha: logro.fecha,
    })),
  };
}

function aDocumento(colectivo) {
  return {
    _id: colectivo.id,
    nombre: colectivo.nombre,
    descripcion: colectivo.descripcion,
    tipoColectivo: colectivo.tipoColectivo,
    ubicacion: colectivo.ubicacion
      ? { tipoUbicacion: colectivo.ubicacion.tipoUbicacion, nombre: colectivo.ubicacion.nombre }
      : null,
    proyectos: colectivo.proyectos.map(proyectoADocumento),
  };
}

export class MongoColectivoRepository {
  // Necesita los otros dos repos para reconstruir las referencias.
  constructor({ habilidadRepository, colaboradorRepository }) {
    this.habilidadRepository = habilidadRepository;
    this.colaboradorRepository = colaboradorRepository;
  }

  // --- Traduccion documento -> dominio ---
  //
  // Un mismo colaborador o habilidad puede aparecer muchas veces dentro de un
  // colectivo (en varios perfiles, en varios proyectos). El cache evita ir a
  // la base una vez por aparicion: guarda la PROMESA de cada busqueda, asi dos
  // pedidos simultaneos del mismo id comparten la misma consulta.
  crearCache() {
    const habilidades = new Map();
    const colaboradores = new Map();

    return {
      habilidad: (codigo) => {
        if (!habilidades.has(codigo)) {
          habilidades.set(codigo, this.habilidadRepository.buscarPorId(codigo));
        }
        return habilidades.get(codigo);
      },
      colaborador: (id) => {
        if (!colaboradores.has(id)) {
          colaboradores.set(id, this.colaboradorRepository.buscarPorId(id));
        }
        return colaboradores.get(id);
      },
    };
  }

  async resolverHabilidades(codigos, cache) {
    const habilidades = await Promise.all((codigos ?? []).map(cache.habilidad));
    // filter(Boolean) descarta las que ya no existen en el catalogo.
    return habilidades.filter(Boolean);
  }

  async perfilADominio(documento, cache) {
    const perfil = new Perfil({
      id: documento._id,
      descripcion: documento.descripcion,
      compromiso: new Compromiso(documento.compromiso),
      modalidadColaboracion: documento.modalidadColaboracion,
    });

    const [requeridas, opcionales] = await Promise.all([
      this.resolverHabilidades(documento.codigosHabilidadesRequeridas, cache),
      this.resolverHabilidades(documento.codigosHabilidadesOpcionales, cache),
    ]);

    perfil.habilidadesRequeridas = requeridas;
    perfil.habilidadesOpcionales = opcionales;

    return perfil;
  }

  async colaboracionADominio(documento, cache) {
    const colaborador = await cache.colaborador(documento.colaboradorId);

    // Si el colaborador ya no existe, la colaboracion queda huerfana.
    if (!colaborador) {
      return null;
    }

    return new Colaboracion({
      id: documento._id,
      colaborador,
      esPublica: documento.esPublica,
      fecha: documento.fecha,
    });
  }

  async proyectoADominio(documento, cache) {
    const proyecto = new Proyecto({
      id: documento._id,
      titulo: documento.titulo,
      descripcion: documento.descripcion,
      urlSistema: documento.urlSistema,
      urlRepositorio: documento.urlRepositorio,
      estado: documento.estado,
    });

    proyecto.porcentajeConcrecion = documento.porcentajeConcrecion ?? 0;
    proyecto.logros = (documento.logros ?? []).map((logro) => new Logro(logro));

    const [perfiles, colaboraciones] = await Promise.all([
      Promise.all((documento.perfiles ?? []).map((p) => this.perfilADominio(p, cache))),
      Promise.all((documento.colaboraciones ?? []).map((c) => this.colaboracionADominio(c, cache))),
    ]);

    proyecto.perfiles = perfiles;
    proyecto.colaboraciones = colaboraciones.filter(Boolean);

    return proyecto;
  }

  async aDominio(documento, cache = this.crearCache()) {
    if (!documento) {
      return null;
    }

    const colectivo = new Colectivo({
      id: documento._id,
      nombre: documento.nombre,
      descripcion: documento.descripcion,
      tipoColectivo: documento.tipoColectivo,
      ubicacion: documento.ubicacion ? new Ubicacion(documento.ubicacion) : null,
    });

    colectivo.proyectos = await Promise.all(
      (documento.proyectos ?? []).map((p) => this.proyectoADominio(p, cache)),
    );

    return colectivo;
  }

  async aDominioVarios(documentos) {
    // Un solo cache para toda la tanda: si el mismo colaborador esta en
    // diez colectivos, se busca una vez.
    const cache = this.crearCache();
    return Promise.all(documentos.map((doc) => this.aDominio(doc, cache)));
  }

  // --- Operaciones del repositorio ---

  async guardar(colectivo) {
    // Se reescribe el documento entero: es el agregado completo.
    await ColectivoModel.updateOne(
      { _id: colectivo.id },
      { $set: aDocumento(colectivo) },
      { upsert: true },
    );

    return colectivo;
  }

  async buscarPorId(id) {
    const documento = await ColectivoModel.findById(id).lean();
    return this.aDominio(documento);
  }

  async listar() {
    const documentos = await ColectivoModel.find().sort(ORDEN).lean();
    return this.aDominioVarios(documentos);
  }

  async listarPaginado(numeroPagina, limitePorPagina) {
    const salto = (numeroPagina - 1) * limitePorPagina;

    const [documentos, total] = await Promise.all([
      ColectivoModel.find().sort(ORDEN).skip(salto).limit(limitePorPagina).lean(),
      ColectivoModel.countDocuments(),
    ]);

    return { items: await this.aDominioVarios(documentos), total };
  }

  // Devuelve el proyecto que esta DENTRO del colectivo reconstruido (la misma
  // referencia en memoria). Los services mutan ese proyecto y despues guardan
  // el colectivo: si fueran dos objetos distintos, el cambio se perderia.
  async buscarProyecto(proyectoId) {
    const documento = await ColectivoModel.findOne({ "proyectos._id": proyectoId }).lean();
    const colectivo = await this.aDominio(documento);

    if (!colectivo) {
      return null;
    }

    const proyecto = colectivo.proyectos.find((p) => p.id === proyectoId);
    return { colectivo, proyecto };
  }

  async buscarPerfil(proyectoId, perfilId) {
    const proyectoConColectivo = await this.buscarProyecto(proyectoId);

    if (!proyectoConColectivo) {
      return null;
    }

    const { colectivo, proyecto } = proyectoConColectivo;
    const perfil = proyecto.perfiles.find((p) => p.id === perfilId) ?? null;

    if (!perfil) {
      return null;
    }

    return { colectivo, proyecto, perfil };
  }

  async listarProyectos() {
    const colectivos = await this.listar();
    return colectivos.flatMap((colectivo) => colectivo.proyectos);
  }

  async listarProyectosPaginado(numeroPagina, limitePorPagina) {
    const salto = (numeroPagina - 1) * limitePorPagina;

    // Los proyectos estan embebidos, asi que no se pueden paginar con un find.
    // $unwind "abre" cada colectivo en un documento por proyecto, y $facet
    // calcula la pagina y el total en una sola consulta.
    const [resultado] = await ColectivoModel.aggregate([
      { $sort: ORDEN },
      { $unwind: "$proyectos" },
      {
        $facet: {
          items: [{ $skip: salto }, { $limit: limitePorPagina }],
          total: [{ $count: "cantidad" }],
        },
      },
    ]);

    const cache = this.crearCache();
    const items = await Promise.all(
      resultado.items.map((doc) => this.proyectoADominio(doc.proyectos, cache)),
    );

    return { items, total: resultado.total[0]?.cantidad ?? 0 };
  }
}
