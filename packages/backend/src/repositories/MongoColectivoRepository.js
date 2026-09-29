import { ColectivoModel } from "../models/ColectivoModel.js";
import { Colectivo } from "../domain/Colectivo.js";
import { Proyecto } from "../domain/Proyecto.js";
import { Perfil } from "../domain/Perfil.js";
import { Compromiso } from "../domain/Compromiso.js";
import { Colaboracion } from "../domain/Colaboracion.js";
import { Logro } from "../domain/Logro.js";
import { Ubicacion } from "../domain/Ubicacion.js";
import { RedSocial } from "../domain/RedSocial.js";
import { Valoracion } from "../domain/Valoracion.js";
import { MedioDeContacto } from "../domain/MedioDeContacto.js";
import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";

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
    estado: colaboracion.estado,
    fechaResolucion: colaboracion.fechaResolucion,
    fechaFin: colaboracion.fechaFin,
    valoracionDelColectivo: valoracionADocumento(colaboracion.valoracionDelColectivo),
    valoracionDelColaborador: valoracionADocumento(colaboracion.valoracionDelColaborador),
  };
}

function valoracionADocumento(valoracion) {
  return valoracion
    ? { puntaje: valoracion.puntaje, comentario: valoracion.comentario, fecha: valoracion.fecha }
    : null;
}

function valoracionADominio(documento) {
  return documento ? new Valoracion(documento) : null;
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
    etiquetas: proyecto.etiquetas,
    modoAceptacion: proyecto.modoAceptacion,
    limiteVacantes: proyecto.limiteVacantes,
    fechaCreacion: proyecto.fechaCreacion,
    fechaFinalizacion: proyecto.fechaFinalizacion,
    fechaCierre: proyecto.fechaCierre,
    visualizaciones: proyecto.visualizaciones,
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
    redesSociales: colectivo.redesSociales.map(({ nombre, url }) => ({ nombre, url })),
    etiquetas: colectivo.etiquetas,
    mediosDeContacto: colectivo.mediosDeContacto.map(({ tipo, valor }) => ({ tipo, valor })),
    fechaAlta: colectivo.fechaAlta,
    fechaBaja: colectivo.fechaBaja,
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
      // Las colaboraciones guardadas antes de que existieran las postulaciones
      // no tienen estado: en ese entonces anotarse era quedar adentro.
      estado: documento.estado ?? COLABORACION_ESTADO.ACEPTADA,
      fechaResolucion: documento.fechaResolucion ?? null,
      fechaFin: documento.fechaFin ?? null,
      valoracionDelColectivo: valoracionADominio(documento.valoracionDelColectivo),
      valoracionDelColaborador: valoracionADominio(documento.valoracionDelColaborador),
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
      // Los proyectos guardados antes del requerimiento 8 funcionaban asi.
      modoAceptacion: documento.modoAceptacion ?? MODO_ACEPTACION.TODO_SUMA,
      limiteVacantes: documento.limiteVacantes ?? null,
      // Los proyectos anteriores a esta entrega no tienen fecha de alta.
      fechaCreacion: documento.fechaCreacion ?? null,
      fechaFinalizacion: documento.fechaFinalizacion ?? null,
      fechaCierre: documento.fechaCierre ?? null,
    });

    proyecto.porcentajeConcrecion = documento.porcentajeConcrecion ?? 0;
    proyecto.logros = (documento.logros ?? []).map((logro) => new Logro(logro));
    proyecto.etiquetas = documento.etiquetas ?? [];
    proyecto.visualizaciones = documento.visualizaciones ?? 0;

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
      // Los colectivos anteriores a esta entrega no tienen fechaAlta: se usa la
      // que Mongoose guarda sola (timestamps).
      fechaAlta: documento.fechaAlta ?? documento.createdAt ?? null,
      fechaBaja: documento.fechaBaja ?? null,
    });
    colectivo.mediosDeContacto = (documento.mediosDeContacto ?? []).map(
      (medio) => new MedioDeContacto(medio),
    );
    colectivo.redesSociales = (documento.redesSociales ?? []).map((red) => new RedSocial(red));
    colectivo.etiquetas = documento.etiquetas ?? [];

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

  async listarPaginado(numeroPagina, limitePorPagina, { etiqueta } = {}) {
    const salto = (numeroPagina - 1) * limitePorPagina;
    // Sobre un array, { etiquetas: "x" } matchea si "x" es uno de sus elementos.
    const filtro = etiqueta ? { etiquetas: etiqueta } : {};

    const [documentos, total] = await Promise.all([
      ColectivoModel.find(filtro).sort(ORDEN).skip(salto).limit(limitePorPagina).lean(),
      ColectivoModel.countDocuments(filtro),
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

  // Suma una visualizacion sin leer ni reescribir el colectivo: $inc lo hace
  // la base, y "proyectos.$" apunta al proyecto que matcheo el filtro.
  async registrarVisualizacion(proyectoId) {
    await ColectivoModel.updateOne(
      { "proyectos._id": proyectoId },
      { $inc: { "proyectos.$.visualizaciones": 1 } },
      // Sin esto, Mongoose agregaria updatedAt y tocaria el colectivo entero.
      { timestamps: false },
    );
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

  // Preselecciona los colectivos que PUEDEN tener un proyecto vencido: alguno
  // abierto y alguno con fecha de cierre pasada (no necesariamente el mismo).
  // La condicion exacta la decide el dominio (Proyecto.cierreVencido) en el
  // service; traer de mas solo cuesta un poco, nunca cierra algo que no toca.
  async buscarConCierreVencido(ahora) {
    const documentos = await ColectivoModel.find({
      "proyectos.estado": "ABIERTO",
      "proyectos.fechaCierre": { $lte: ahora },
    }).lean();
    return this.aDominioVarios(documentos);
  }

  // Los colectivos en los que la persona tiene alguna colaboracion.
  async buscarColectivosDeColaborador(colaboradorId) {
    const documentos = await ColectivoModel.find({
      "proyectos.colaboraciones.colaboradorId": colaboradorId,
    })
      .sort(ORDEN)
      .lean();
    return this.aDominioVarios(documentos);
  }

  async listarProyectos() {
    const colectivos = await this.listar();
    return colectivos.flatMap((colectivo) => colectivo.proyectos);
  }

  async listarProyectosPaginado(numeroPagina, limitePorPagina, { etiqueta } = {}) {
    const salto = (numeroPagina - 1) * limitePorPagina;
    // Despues del $unwind cada documento es un proyecto: se filtra por las
    // etiquetas del proyecto, no por las del colectivo.
    const filtroPorEtiqueta = etiqueta ? [{ $match: { "proyectos.etiquetas": etiqueta } }] : [];

    // Los proyectos estan embebidos, asi que no se pueden paginar con un find.
    // $unwind "abre" cada colectivo en un documento por proyecto, y $facet
    // calcula la pagina y el total en una sola consulta.
    const [resultado] = await ColectivoModel.aggregate([
      { $sort: ORDEN },
      { $unwind: "$proyectos" },
      ...filtroPorEtiqueta,
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
