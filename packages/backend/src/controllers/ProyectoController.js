import { BaseController } from "./BaseController.js";
import { proyectoService, colaboracionService } from "../services/index.js";
import {
  actualizarProyectoSchema,
  agregarHabilidadSchema,
  anotarColaboradorSchema,
  cambiarEstadoProyectoSchema,
} from "../schemas/proyectoSchema.js";
import { serializar } from "../utils/serializadores.js";

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
    const body = req.body;
    const resultado = actualizarProyectoSchema.safeParse(body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const proyecto = this.proyectoService.actualizar(req.params.id, resultado.data);
      return res.status(200).json({ status: "success", data: proyecto });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  cambiarEstado = (req, res) => {
    const resultado = cambiarEstadoProyectoSchema.safeParse(req.body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const proyecto = this.proyectoService.finalizar(req.params.id);
      return res.status(200).json({ status: "success", data: proyecto });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  agregarHabilidad = (req, res) => {
    const body = req.body;
    const resultado = agregarHabilidadSchema.safeParse(body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const proyecto = this.proyectoService.agregarHabilidadRequerida(
        req.params.id,
        resultado.data.codigoHabilidad,
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
    const body = req.body;
    const resultado = anotarColaboradorSchema.safeParse(body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const colaboracion = this.colaboracionService.registrar({
        proyectoId: req.params.id,
        colaboradorId: resultado.data.colaboradorId,
      });
      return res.status(201).json({
        status: "success",
        data: serializar(colaboracion),
      });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  listarColaboraciones = (req, res) => {
    try {
      const colaboraciones = this.colaboracionService.listarPorProyecto(req.params.id);
      const data = colaboraciones.map((colaboracion) => serializar(colaboracion));
      return res.status(200).json({ status: "success", data });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };
}
