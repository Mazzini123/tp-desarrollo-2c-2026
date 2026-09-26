import { BaseController } from "./BaseController.js";

export class ProyectoController extends BaseController {
  constructor({ proyectoService, colaboracionService }) {
    super();
    this.proyectoService = proyectoService;
    this.colaboracionService = colaboracionService;
  }

  listar = (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(res, this.proyectoService.listar(paginacion));
  };

  obtenerPorId = (req, res) => {
    res.status(200).json(this.proyectoService.buscarPorId(req.params.id));
  };

  actualizar = (req, res) => {
    res.status(200).json(this.proyectoService.actualizar(req.params.id, req.body));
  };

  finalizar = (req, res) => {
    res.status(200).json(this.proyectoService.finalizar(req.params.id));
  };

  anotarColaborador = (req, res) => {
    const colaboracion = this.colaboracionService.registrar({
      proyectoId: req.params.id,
      colaboradorId: req.body.colaboradorId,
    });
    res.status(201).json(colaboracion);
  };

  listarColaboraciones = (req, res) => {
    res.status(200).json(this.colaboracionService.listarPorProyecto(req.params.id));
  };
}
