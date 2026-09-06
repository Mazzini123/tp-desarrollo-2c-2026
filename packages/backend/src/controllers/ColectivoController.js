import { BaseController } from "./BaseController.js";
import { colectivoService, proyectoService } from "../services/index.js";

/**
 * Los métodos se escriben como propiedades con función flecha para
 * que `this` siga apuntando al controlador cuando el router los pasa
 * como callback.
 */
export class ColectivoController extends BaseController {
  constructor(servicioColectivo = colectivoService, servicioProyecto = proyectoService) {
    super();
    this.colectivoService = servicioColectivo;
    this.proyectoService = servicioProyecto;
  }

  crear = (req, res) => {
    try {
      const colectivo = this.colectivoService.crear(req.body);
      return res.status(201).json({ status: "success", data: colectivo });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  listar = (req, res) => {
    try {
      const paginacion = this.extraerPaginacion(req.query);
      return this.responderPaginado(res, this.colectivoService.listar(paginacion));
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  obtenerPorId = (req, res) => {
    try {
      const colectivo = this.colectivoService.buscarPorId(req.params.id);
      return res.status(200).json({ status: "success", data: colectivo });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  actualizar = (req, res) => {
    try {
      const colectivo = this.colectivoService.actualizar(req.params.id, req.body);
      return res.status(200).json({ status: "success", data: colectivo });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  crearProyecto = (req, res) => {
    try {
      const proyecto = this.proyectoService.crear({ ...req.body, colectivoId: req.params.id });
      return res.status(201).json({ status: "success", data: proyecto });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  listarProyectos = (req, res) => {
    try {
      const proyectos = this.proyectoService.listarPorColectivo(req.params.id);
      return res.status(200).json({ status: "success", data: proyectos });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };
}
