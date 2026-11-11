import { BaseController } from "./BaseController.js";
import { colectivoDelContexto } from "../security/http/contexto.js";
import { proyectoPublico } from "../dto/vistasPublicas.js";

export class ProyectoController extends BaseController {
  constructor({ proyectoService, colaboracionService }) {
    super();
    this.proyectoService = proyectoService;
    this.colaboracionService = colaboracionService;
  }

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.consulta);
    const { etiqueta, estado, habilidad, tipoColectivo, ubicacion, modalidad } =
      req.consulta;
    const filtros = { etiqueta, estado, habilidad, tipoColectivo, ubicacion, modalidad };
    const pagina = await this.proyectoService.listar({ ...paginacion, ...filtros });
    this.responderPaginado(res, pagina);
  };

  obtenerPorId = async (req, res) => {
    const { proyecto, esDueno } = await this.proyectoService.verDetalle(
      req.params.id,
      colectivoDelContexto(req.contexto),
    );
    res.status(200).json(esDueno ? proyecto : proyectoPublico(proyecto));
  };

  actualizar = async (req, res) => {
    res.status(200).json(await this.proyectoService.actualizar(req.params.id, req.body));
  };

  finalizar = async (req, res) => {
    res.status(200).json(await this.proyectoService.finalizar(req.params.id));
  };

  datosDeContacto = async (req, res) => {
    res
      .status(200)
      .json(
        await this.colaboracionService.datosDeContacto(
          req.params.id,
          req.params.colaboradorId,
        ),
      );
  };

  anotarColaborador = async (req, res) => {
    const colaboracion = await this.colaboracionService.registrar({
      proyectoId: req.params.id,
      perfilId: req.body.perfilId,
      colaboradorId: req.body.colaboradorId,
      esPublica: req.body.esPublica,
    });
    res.status(201).json(colaboracion);
  };

  listarColaboraciones = async (req, res) => {
    this.responderPaginado(
      res,
      await this.colaboracionService.listarPaginaPorProyecto(req.params.id, {
        ...this.aPaginacionDeDominio(req.consulta),
        estado: req.consulta.estado,
        privadas: true,
      }),
    );
  };

  listarParticipaciones = async (req, res) => {
    this.responderPaginado(
      res,
      await this.colaboracionService.listarPaginaPorProyecto(
        req.params.id,
        this.aPaginacionDeDominio(req.consulta),
      ),
    );
  };
}
