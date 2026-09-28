import { BaseController } from "./BaseController.js";

export class ColectivoController extends BaseController {
  constructor({ colectivoService, proyectoService }) {
    super();
    this.colectivoService = colectivoService;
    this.proyectoService = proyectoService;
  }

  crear = async (req, res) => {
    res.status(201).json(await this.colectivoService.crear(req.body));
  };

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(res, await this.colectivoService.listar(paginacion));
  };

  obtenerPorId = async (req, res) => {
    res.status(200).json(await this.colectivoService.buscarPorId(req.params.id));
  };

  actualizar = async (req, res) => {
    res.status(200).json(await this.colectivoService.actualizar(req.params.id, req.body));
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
}
