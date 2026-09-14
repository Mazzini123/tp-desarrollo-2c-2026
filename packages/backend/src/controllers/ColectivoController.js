import { BaseController } from "./BaseController.js";

export class ColectivoController extends BaseController {
  // Correccion B1: sin defaults. Si no le pasan los services, no arranca.
  // Quien decide las implementaciones concretas es `composicion.js`.
  constructor({ colectivoService, proyectoService }) {
    super();
    this.colectivoService = colectivoService;
    this.proyectoService = proyectoService;
  }

  // Sin try/catch y sin safeParse: el body ya viene validado por el middleware
  // del router, y cualquier excepcion la traduce el manejador de errores.
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
