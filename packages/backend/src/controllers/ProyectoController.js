import { BaseController } from "./BaseController.js";
import { proyectoService, colaboracionService } from "../services/index.js";

export class ProyectoController extends BaseController {
  constructor(servicioProyecto = proyectoService, servicioColaboracion = colaboracionService) {
    super();
    this.proyectoService = servicioProyecto;
    this.colaboracionService = servicioColaboracion;
  }

  listar = (req, res) => {
    try {
      const paginacion = this.extraerPaginacion(req.query);
      return this.responderPaginado(res, this.proyectoService.listar(paginacion));
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  obtenerPorId = (req, res) => {
    try {
      const proyecto = this.proyectoService.buscarPorId(req.params.id);
      return res.status(200).json({ status: "success", data: proyecto });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  actualizar = (req, res) => {
    try {
      const proyecto = this.proyectoService.actualizar(req.params.id, req.body);
      return res.status(200).json({ status: "success", data: proyecto });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  finalizar = (req, res) => {
    try {
      const proyecto = this.proyectoService.finalizar(req.params.id);
      return res.status(200).json({ status: "success", data: proyecto });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  agregarHabilidad = (req, res) => {
    try {
      const proyecto = this.proyectoService.agregarHabilidadRequerida(
        req.params.id,
        req.body.codigoHabilidad,
      );
      return res.status(200).json({ status: "success", data: proyecto });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  quitarHabilidad = (req, res) => {
    try {
      const proyecto = this.proyectoService.quitarHabilidadRequerida(
        req.params.id,
        req.params.codigoHabilidad,
      );
      return res.status(200).json({ status: "success", data: proyecto });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  anotarColaborador = (req, res) => {
    try {
      const colaboracion = this.colaboracionService.registrar({
        proyectoId: req.params.id,
        colaboradorId: req.body.colaboradorId,
      });
      return res.status(201).json({ status: "success", data: colaboracion });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  listarColaboraciones = (req, res) => {
    try {
      const colaboraciones = this.colaboracionService.listarPorProyecto(req.params.id);
      return res.status(200).json({ status: "success", data: colaboraciones });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };
}
