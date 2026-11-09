import { BaseController } from "./BaseController.js";
import { medioDeContactoSchema } from "../schemas/medioDeContactoSchema.js";

export class ColaboradorController extends BaseController {
  constructor({ colaboradorService, colaboracionService }) {
    super();
    this.colaboradorService = colaboradorService;
    this.colaboracionService = colaboracionService;
  }

  crear = async (req, res) => {
    const cuentaId = req.identidad?.sub ?? null;
    res.status(201).json(await this.colaboradorService.crear({ ...req.body, cuentaId }));
  };

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    this.responderPaginado(res, await this.colaboradorService.listar(paginacion));
  };

  obtenerPorId = async (req, res) => {
    res.status(200).json(await this.colaboradorService.buscarPorId(req.params.id));
  };

  actualizar = async (req, res) => {
    res
      .status(200)
      .json(await this.colaboradorService.actualizar(req.params.id, req.body));
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

  mediosDeContacto = async (req, res) => {
    res.status(200).json(await this.colaboradorService.mediosDeContacto(req.params.id));
  };

  agregarMedioDeContacto = async (req, res) => {
    res
      .status(201)
      .json(
        await this.colaboradorService.agregarMedioDeContacto(req.params.id, req.body),
      );
  };

  quitarMedioDeContacto = async (req, res) => {
    const medio = medioDeContactoSchema.parse({
      tipo: req.params.tipo,
      valor: req.params.valor,
    });
    await this.colaboradorService.quitarMedioDeContacto(req.params.id, medio);
    res.status(204).send();
  };

  listarValoraciones = async (req, res) => {
    res
      .status(200)
      .json(
        await this.colaboracionService.listarValoracionesDeColaborador(req.params.id),
      );
  };

  listarColaboraciones = async (req, res) => {
    const esLaDuena =
      req.cuenta?.rol === "COLABORADORA" && req.cuenta.perfilId === req.params.id;
    res.status(200).json(
      await this.colaboracionService.listarPorColaborador(req.params.id, {
        incluirAnonimas: esLaDuena,
      }),
    );
  };
}
