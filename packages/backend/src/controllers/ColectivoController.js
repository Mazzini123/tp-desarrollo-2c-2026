import { BaseController } from "./BaseController.js";
import { colectivoDelContexto } from "../security/http/contexto.js";
import { colectivoPublico, paginaPublica } from "../dto/vistasPublicas.js";

const esElColectivo = (req) => colectivoDelContexto(req.contexto) === req.params.id;

export class ColectivoController extends BaseController {
  constructor({
    colectivoService,
    timelineService,
    valoracionService,
    proyectoService,
    colaboracionService,
    modalidadService,
    membresiaService,
  }) {
    super();
    this.colectivoService = colectivoService;
    this.timelineService = timelineService;
    this.valoracionService = valoracionService;
    this.membresiaService = membresiaService;
    this.modalidadService = modalidadService;
    this.proyectoService = proyectoService;
    this.colaboracionService = colaboracionService;
  }

  crear = async (req, res) => {
    const colectivo = req.usuario
      ? await this.modalidadService.crearColectivo(req.usuario, req.body)
      : await this.colectivoService.crear(req.body);
    res.status(201).json(await this.colectivoService.conPrimerosProyectos(colectivo));
  };

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.consulta);
    const { etiqueta } = req.consulta;
    const pagina = await this.colectivoService.listar({ ...paginacion, etiqueta });
    const items = await this.colectivoService.conCantidadDeProyectos(pagina.items);
    this.responderPaginado(res, paginaPublica({ ...pagina, items }, colectivoPublico));
  };

  obtenerPorId = async (req, res) => {
    const colectivo = await this.colectivoService.conPrimerosProyectos(
      await this.colectivoService.buscarPorId(req.params.id),
    );
    res.status(200).json(esElColectivo(req) ? colectivo : colectivoPublico(colectivo));
  };

  actualizar = async (req, res) => {
    const colectivo = await this.colectivoService.actualizar(req.params.id, req.body);
    res.status(200).json(await this.colectivoService.conPrimerosProyectos(colectivo));
  };

  mediosDeContacto = async (req, res) => {
    res.status(200).json(await this.colectivoService.mediosDeContacto(req.params.id));
  };

  agregarMedioDeContacto = async (req, res) => {
    res
      .status(201)
      .json(await this.colectivoService.agregarMedioDeContacto(req.params.id, req.body));
  };

  quitarMedioDeContacto = async (req, res) => {
    await this.colectivoService.quitarMedioDeContacto(req.params.id, req.parametros);
    res.status(204).send();
  };

  darDeBaja = async (req, res) => {
    const colectivo = await this.membresiaService.darDeBajaColectivo(req.params.id, {
      contexto: req.contexto,
    });
    res.status(200).json(await this.colectivoService.conPrimerosProyectos(colectivo));
  };

  crearProyecto = async (req, res) => {
    const proyecto = await this.proyectoService.crear({
      ...req.body,
      colectivoId: req.params.id,
      claveIdempotencia: req.encabezados["idempotency-key"],
    });
    res.status(201).json(proyecto);
  };

  listarProyectos = async (req, res) => {
    const pagina = await this.proyectoService.listarResumenesPorColectivo(req.params.id, {
      ...this.aPaginacionDeDominio(req.consulta),
      incluirPendientes: esElColectivo(req),
    });
    this.responderPaginado(
      res,
      pagina,
      pagina.perfilesAbiertos === undefined
        ? {}
        : { perfiles_abiertos: pagina.perfilesAbiertos },
    );
  };

  listarPendientes = async (req, res) => {
    this.responderPaginado(
      res,
      await this.colaboracionService.listarPendientesDeColectivo(
        req.params.id,
        this.aPaginacionDeDominio(req.consulta),
      ),
    );
  };

  timeline = async (req, res) => {
    res.status(200).json(await this.timelineService.timeline(req.params.id));
  };

  listarValoraciones = async (req, res) => {
    res
      .status(200)
      .json(await this.valoracionService.listarValoracionesDeColectivo(req.params.id));
  };
}
