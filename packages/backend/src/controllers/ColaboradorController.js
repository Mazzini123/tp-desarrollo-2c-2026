import { BaseController } from "./BaseController.js";
import { colaboradorService, colaboracionService } from "../services/index.js";
import { actualizarColaboradorSchema, crearColaboradorSchema } from "../schemas/colaboradorSchema.js";
import { agregarHabilidadSchema } from "../schemas/proyectoSchema.js";
import { serializar } from "../utils/serializadores.js";

export class ColaboradorController extends BaseController {
  constructor(servicioColaborador = colaboradorService, servicioColaboracion = colaboracionService) {
    super();
    this.colaboradorService = servicioColaborador;
    this.colaboracionService = servicioColaboracion;
  }

  crear = (req, res) => {
    const body = req.body;
    const resultado = crearColaboradorSchema.safeParse(body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const colaborador = this.colaboradorService.crear(resultado.data);
      return res.status(201).json({ status: "success", data: serializar(colaborador) });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  listar = (req, res) => {
    try {
      const paginacion = this.extraerPaginacion(req.query);
      const pagina = this.colaboradorService.listar(paginacion);
      return this.responderPaginado(res, {
        ...pagina,
        items: pagina.items.map(serializar),
      });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  obtenerPorId = (req, res) => {
    try {
      const colaborador = this.colaboradorService.buscarPorId(req.params.id);
      return res.status(200).json({ status: "success", data: serializar(colaborador) });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  actualizar = (req, res) => {
    const body = req.body;
    const resultado = actualizarColaboradorSchema.safeParse(body);
    if (resultado.error) {
      return this.manejarError(res, resultado.error);
    }

    try {
      const colaborador = this.colaboradorService.actualizar(req.params.id, resultado.data);
      return res.status(200).json({ status: "success", data: serializar(colaborador) });
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
      const colaborador = this.colaboradorService.agregarHabilidad(
        req.params.id,
        resultado.data.codigoHabilidad,
      );
      return res.status(200).json({ status: "success", data: serializar(colaborador) });
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
      return res.status(200).json({ status: "success", data: serializar(colaborador) });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };

  listarColaboraciones = (req, res) => {
    try {
      const colaboraciones = this.colaboracionService.listarPorColaborador(req.params.id);
      const data = colaboraciones.map(({ proyectoId, colaboracion }) => ({
        proyectoId,
        colaboracion: serializar(colaboracion),
      }));
      return res.status(200).json({ status: "success", data });
    } catch (error) {
      return this.manejarError(res, error);
    }
  };
}
