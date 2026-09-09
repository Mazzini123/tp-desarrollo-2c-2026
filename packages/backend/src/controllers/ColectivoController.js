import { BaseController } from "./BaseController.js";
import { crearColectivoSchema, actualizarColectivoSchema } from "../schemas/colectivoSchema.js";
import { crearProyectoSchema } from "../schemas/proyectoSchema.js";
import { colectivoService, proyectoService } from "../services/index.js";

export class ColectivoController extends BaseController {
  constructor(servicioColectivo = colectivoService, servicioProyecto = proyectoService) {
    super();
    this.colectivoService = servicioColectivo;
    this.proyectoService = servicioProyecto;
  }

  crear = (req, res) => {
    const body = req.body;
    const resultado = crearColectivoSchema.safeParse(body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const colectivo = this.colectivoService.crear(resultado.data);
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
    const body = req.body;
    const resultado = actualizarColectivoSchema.safeParse(body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const colectivo = this.colectivoService.actualizar(req.params.id, resultado.data);
      return res.status(200).json({ status: "success", data: colectivo });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  crearProyecto = (req, res) => {
    const body = req.body;
    const resultado = crearProyectoSchema.safeParse(body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const proyecto = this.proyectoService.crear({
        ...resultado.data,
        colectivoId: req.params.id,
      });
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
