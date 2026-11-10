import { BaseController } from "./BaseController.js";
import { colaboradorDelContexto } from "../security/http/contexto.js";

export class ColaboradorController extends BaseController {
  constructor({ colaboradorService, colaboracionService, modalidadService }) {
    super();
    this.colaboradorService = colaboradorService;
    this.modalidadService = modalidadService;
    this.colaboracionService = colaboracionService;
  }

  crear = async (req, res) => {
    const colaborador = req.usuario
      ? await this.modalidadService.crearPerfilColaborador(req.usuario, req.body)
      : await this.colaboradorService.crear(req.body);
    res.status(201).json(colaborador);
  };

  darDeBaja = async (req, res) => {
    res
      .status(200)
      .json(await this.modalidadService.darDeBajaPerfilColaborador(req.params.id));
  };

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.consulta);
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
    await this.colaboradorService.quitarMedioDeContacto(req.params.id, req.parametros);
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
    const esLaDuena = colaboradorDelContexto(req.contexto) === req.params.id;
    res.status(200).json(
      await this.colaboracionService.listarPorColaborador(req.params.id, {
        incluirAnonimas: esLaDuena,
      }),
    );
  };
}
