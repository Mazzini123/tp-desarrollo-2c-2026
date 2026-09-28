import { BaseController } from "./BaseController.js";

export class ColaboradorController extends BaseController {
  constructor({ colaboradorService, colaboracionService }) {
    super();
    this.colaboradorService = colaboradorService;
    this.colaboracionService = colaboracionService;
  }

  crear = async (req, res) => {
    res.status(201).json(await this.colaboradorService.crear(req.body));
  };

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(res, await this.colaboradorService.listar(paginacion));
  };

  obtenerPorId = async (req, res) => {
    res.status(200).json(await this.colaboradorService.buscarPorId(req.params.id));
  };

  actualizar = async (req, res) => {
    res.status(200).json(await this.colaboradorService.actualizar(req.params.id, req.body));
  };

  agregarPronombre = async (req, res) => {
    const colaborador = await this.colaboradorService.agregarPronombre(
      req.params.id,
      req.body.pronombre,
    );
    res.status(200).json(colaborador);
  };

  quitarPronombre = async (req, res) => {
    const colaborador = await this.colaboradorService.quitarPronombre(
      req.params.id,
      req.params.pronombre,
    );
    res.status(200).json(colaborador);
  };

  agregarHabilidad = async (req, res) => {
    const colaborador = await this.colaboradorService.agregarHabilidad(
      req.params.id,
      req.body.codigoHabilidad,
    );
    res.status(200).json(colaborador);
  };

  quitarHabilidad = async (req, res) => {
    const colaborador = await this.colaboradorService.quitarHabilidad(
      req.params.id,
      req.params.codigoHabilidad,
    );
    res.status(200).json(colaborador);
  };

  listarColaboraciones = (req, res) => {
    res.status(200).json(this.colaboracionService.listarPorColaborador(req.params.id));
  };
}
