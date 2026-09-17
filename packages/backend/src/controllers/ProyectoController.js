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

  agregarHabilidad = (req, res) => {
    const proyecto = this.proyectoService.agregarHabilidadRequerida(
      req.params.id,
      req.body.codigoHabilidad,
    );
    res.status(200).json(proyecto);
  };

  quitarHabilidad = (req, res) => {
    const proyecto = this.proyectoService.quitarHabilidadRequerida(
      req.params.id,
      req.params.codigoHabilidad,
    );
    res.status(200).json(proyecto);
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
