import { BaseController } from "./BaseController.js";
import { colaboradorService, colaboracionService } from "../services/index.js";

export class ColaboradorController extends BaseController {
  constructor(servicioColaborador = colaboradorService, servicioColaboracion = colaboracionService) {
    super();
    this.colaboradorService = servicioColaborador;
    this.colaboracionService = servicioColaboracion;
  }

  crear = (req, res) => {
    try {
      const colaborador = this.colaboradorService.crear(req.body);
      return res.status(201).json({ status: "success", data: colaborador });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  listar = (req, res) => {
    try {
      const paginacion = this.extraerPaginacion(req.query);
      return this.responderPaginado(res, this.colaboradorService.listar(paginacion));
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  obtenerPorId = (req, res) => {
    try {
      const colaborador = this.colaboradorService.buscarPorId(req.params.id);
      return res.status(200).json({ status: "success", data: colaborador });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  actualizar = (req, res) => {
    try {
      const colaborador = this.colaboradorService.actualizar(req.params.id, req.body);
      return res.status(200).json({ status: "success", data: colaborador });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  agregarHabilidad = (req, res) => {
    try {
      const colaborador = this.colaboradorService.agregarHabilidad(
        req.params.id,
        req.body.codigoHabilidad,
      );
      return res.status(200).json({ status: "success", data: colaborador });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  quitarHabilidad = (req, res) => {
    try {
      const colaborador = this.colaboradorService.quitarHabilidad(
        req.params.id,
        req.params.codigoHabilidad,
      );
      return res.status(200).json({ status: "success", data: colaborador });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  listarColaboraciones = (req, res) => {
    try {
      const colaboraciones = this.colaboracionService.listarPorColaborador(req.params.id);
      return res.status(200).json({ status: "success", data: colaboraciones });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };
}
