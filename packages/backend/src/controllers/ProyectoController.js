import { BaseController } from "./BaseController.js";

export class ProyectoController extends BaseController {
  constructor({ proyectoService, colaboracionService }) {
    super();
    this.proyectoService = proyectoService;
    this.colaboracionService = colaboracionService;
  }

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    const { etiqueta, estado, habilidad, tipoColectivo, ubicacion, modalidad } =
      req.paginacion;
    const filtros = { etiqueta, estado, habilidad, tipoColectivo, ubicacion, modalidad };
    this.responderPaginado(
      res,
      await this.proyectoService.listar({ ...paginacion, ...filtros }),
    );
  };

  obtenerPorId = async (req, res) => {
    res.status(200).json(await this.proyectoService.verDetalle(req.params.id, req.cuenta));
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
