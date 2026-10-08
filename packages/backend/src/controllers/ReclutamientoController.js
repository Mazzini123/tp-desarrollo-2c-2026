import { BaseController } from "./BaseController.js";

export class ReclutamientoController extends BaseController {
  constructor({ reclutamientoService }) {
    super();
    this.reclutamientoService = reclutamientoService;
  }

  buscarColaboradoras = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(
      res,
      await this.reclutamientoService.buscarColaboradoras(
        req.params.id,
        req.params.perfilId,
        paginacion,
      ),
    );
  };

  buscarProyectos = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(
      res,
      await this.reclutamientoService.buscarProyectos(req.params.id, paginacion),
    );
  };

  invitar = async (req, res) => {
    res
      .status(201)
      .json(
        await this.reclutamientoService.invitar(req.params.id, req.params.perfilId, req.body),
      );
  };
}
