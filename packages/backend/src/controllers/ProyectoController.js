import { BaseController } from "./BaseController.js";

export class ProyectoController extends BaseController {
  constructor({ proyectoService, colaboracionService }) {
    super();
    this.proyectoService = proyectoService;
    this.colaboracionService = colaboracionService;
  }

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(res, await this.proyectoService.listar(paginacion));
  };

  obtenerPorId = async (req, res) => {
    res.status(200).json(await this.proyectoService.buscarPorId(req.params.id));
  };

  actualizar = async (req, res) => {
    res.status(200).json(await this.proyectoService.actualizar(req.params.id, req.body));
  };

  finalizar = async (req, res) => {
    res.status(200).json(await this.proyectoService.finalizar(req.params.id));
  };

  anotarColaborador = async (req, res) => {
    const colaboracion = await this.colaboracionService.registrar({
      proyectoId: req.params.id,
      colaboradorId: req.body.colaboradorId,
      esPublica: req.body.esPublica,
    });
    res.status(201).json(colaboracion);
  };

  listarColaboraciones = async (req, res) => {
    res.status(200).json(await this.colaboracionService.listarPorProyecto(req.params.id));
  };
}
