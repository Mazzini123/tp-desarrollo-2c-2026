import { BaseController } from "./BaseController.js";

export class ColectivoController extends BaseController {
  constructor({ colectivoService, proyectoService, colaboracionService }) {
    super();
    this.colectivoService = colectivoService;
    this.proyectoService = proyectoService;
    this.colaboracionService = colaboracionService;
  }

  crear = async (req, res) => {
    res.status(201).json(await this.colectivoService.crear(req.body));
  };

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    const { etiqueta } = req.paginacion;
    this.responderPaginado(res, await this.colectivoService.listar({ ...paginacion, etiqueta }));
  };

  obtenerPorId = async (req, res) => {
    res.status(200).json(await this.colectivoService.buscarPorId(req.params.id));
  };

  actualizar = async (req, res) => {
    res.status(200).json(await this.colectivoService.actualizar(req.params.id, req.body));
  };

  darDeBaja = async (req, res) => {
    res.status(200).json(await this.colectivoService.darDeBaja(req.params.id));
  };

  crearProyecto = async (req, res) => {
    const proyecto = await this.proyectoService.crear({
      ...req.body,
      colectivoId: req.params.id,
    });
    res.status(201).json(proyecto);
  };

  listarProyectos = async (req, res) => {
    res.status(200).json(await this.proyectoService.listarPorColectivo(req.params.id));
  };

  timeline = async (req, res) => {
    res.status(200).json(await this.colectivoService.timeline(req.params.id));
  };

  listarValoraciones = async (req, res) => {
    res
      .status(200)
      .json(await this.colaboracionService.listarValoracionesDeColectivo(req.params.id));
  };
}
