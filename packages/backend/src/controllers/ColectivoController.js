import { BaseController } from "./BaseController.js";

export class ColectivoController extends BaseController {
  constructor({ colectivoService, proyectoService }) {
    super();
    this.colectivoService = colectivoService;
    this.proyectoService = proyectoService;
  }

  crear = (req, res) => {
    res.status(201).json(this.colectivoService.crear(req.body));
  };

  listar = (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(res, this.colectivoService.listar(paginacion));
  };

  obtenerPorId = (req, res) => {
    res.status(200).json(this.colectivoService.buscarPorId(req.params.id));
  };

  actualizar = (req, res) => {
    res.status(200).json(this.colectivoService.actualizar(req.params.id, req.body));
  };

  crearProyecto = (req, res) => {
    const proyecto = this.proyectoService.crear({
      ...req.body,
      colectivoId: req.params.id,
    });
    res.status(201).json(proyecto);
  };

  listarProyectos = (req, res) => {
    res.status(200).json(this.proyectoService.listarPorColectivo(req.params.id));
  };
}
