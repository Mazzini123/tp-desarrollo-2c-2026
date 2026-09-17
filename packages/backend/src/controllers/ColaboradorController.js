import { BaseController } from "./BaseController.js";

export class ColaboradorController extends BaseController {
  constructor({ colaboradorService, colaboracionService }) {
    super();
    this.colaboradorService = colaboradorService;
    this.colaboracionService = colaboracionService;
  }

  crear = (req, res) => {
    res.status(201).json(this.colaboradorService.crear(req.body));
  };

  listar = (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(res, this.colaboradorService.listar(paginacion));
  };

  obtenerPorId = (req, res) => {
    res.status(200).json(this.colaboradorService.buscarPorId(req.params.id));
  };

  actualizar = (req, res) => {
    res.status(200).json(this.colaboradorService.actualizar(req.params.id, req.body));
  };

  agregarPronombre = (req, res) => {
    const colaborador = this.colaboradorService.agregarPronombre(
      req.params.id,
      req.body.pronombre,
    );
    res.status(200).json(colaborador);
  };

  quitarPronombre = (req, res) => {
    const colaborador = this.colaboradorService.quitarPronombre(
      req.params.id,
      req.params.pronombre,
    );
    res.status(200).json(colaborador);
  };

  agregarHabilidad = (req, res) => {
    const colaborador = this.colaboradorService.agregarHabilidad(
      req.params.id,
      req.body.codigoHabilidad,
    );
    res.status(200).json(colaborador);
  };

  quitarHabilidad = (req, res) => {
    const colaborador = this.colaboradorService.quitarHabilidad(
      req.params.id,
      req.params.codigoHabilidad,
    );
    res.status(200).json(colaborador);
  };

  listarColaboraciones = (req, res) => {
    res.status(200).json(this.colaboracionService.listarPorColaborador(req.params.id));
  };
}
