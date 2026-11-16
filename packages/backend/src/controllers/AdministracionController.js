import { BaseController } from "./BaseController.js";

const actorDe = (req) => ({ usuarioId: req.usuario._id, contextoId: req.contexto._id });

export class AdministracionController extends BaseController {
  constructor({
    auditoriaService,
    revisionService,
    destacadoService,
    administradorService,
    terminosService,
    bajaPorInfraccionService,
  }) {
    super();
    this.terminosService = terminosService;
    this.bajaPorInfraccionService = bajaPorInfraccionService;
    this.auditoriaService = auditoriaService;
    this.revisionService = revisionService;
    this.destacadoService = destacadoService;
    this.administradorService = administradorService;
  }

  listarAuditoria = async (req, res) => {
    const { accion, entidadTipo, entidadId, desde, hasta } = req.consulta;
    this.responderPaginado(
      res,
      await this.auditoriaService.listar({
        ...this.aPaginacionDeDominio(req.consulta),
        accion,
        entidadTipo,
        entidadId,
        desde,
        hasta,
      }),
    );
  };

  listarRevisiones = async (req, res) => {
    const { estado, motivo } = req.consulta;
    this.responderPaginado(
      res,
      await this.revisionService.listar({
        ...this.aPaginacionDeDominio(req.consulta),
        estado,
        motivo,
      }),
    );
  };

  resolverRevision = async (req, res) => {
    res.status(200).json(
      await this.revisionService.resolver({
        revisionId: req.params.id,
        estado: req.body.estado,
        nota: req.body.nota ?? null,
        actor: actorDe(req),
      }),
    );
  };

  listarDestacados = async (req, res) => {
    res
      .status(200)
      .json(await this.destacadoService.listarVigentes({ usuarioId: req.usuario._id }));
  };

  destacarProyecto = async (req, res) => {
    res.status(200).json(
      await this.destacadoService.destacar({
        proyectoId: req.params.id,
        hasta: req.body.hasta,
        actor: actorDe(req),
      }),
    );
  };

  quitarDestacado = async (req, res) => {
    await this.destacadoService.quitar({
      proyectoId: req.params.id,
      actor: actorDe(req),
    });
    res.status(204).end();
  };

  publicarTerminos = async (req, res) => {
    res.status(201).json(
      await this.terminosService.publicar({
        texto: req.body.texto,
        actor: actorDe(req),
      }),
    );
  };

  listarProyectos = async (req, res) => {
    const { q, etiqueta, estado } = req.consulta;
    this.responderPaginado(
      res,
      await this.bajaPorInfraccionService.listarProyectos({
        ...this.aPaginacionDeDominio(req.consulta),
        q,
        etiqueta,
        estado,
        usuarioId: req.usuario._id,
      }),
    );
  };

  darDeBajaProyecto = async (req, res) => {
    res.status(200).json(
      await this.bajaPorInfraccionService.darDeBajaProyecto({
        proyectoId: req.params.id,
        motivo: req.body.motivo,
        actor: actorDe(req),
      }),
    );
  };

  darDeBajaColectivo = async (req, res) => {
    res.status(200).json(
      await this.bajaPorInfraccionService.darDeBajaColectivo({
        colectivoId: req.params.id,
        motivo: req.body.motivo,
        actor: actorDe(req),
      }),
    );
  };

  otorgarAdministrador = async (req, res) => {
    const { usuarioId } = req.body;
    const resultado = await this.administradorService.otorgar({
      usuarioId,
      actor: actorDe(req),
    });
    if (!resultado.creado) {
      res.status(200).json({ usuarioId, creado: false });
      return;
    }
    res.status(201).json({ usuarioId, contextoId: resultado.contextoId, creado: true });
  };
}
