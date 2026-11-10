import { BaseController } from "./BaseController.js";
import { colectivoDelContexto } from "../domain/contexto.js";
import { paginaPublica, proyectoPublico } from "../dto/vistasPublicas.js";

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
    this.responderPaginado(res, paginaPublica(pagina, proyectoPublico));
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
    res.status(200).json(await this.colaboracionService.listarPorProyecto(req.params.id));
  };
}
