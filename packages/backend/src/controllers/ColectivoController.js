import { z } from "zod";
import { BaseController } from "./BaseController.js";
import { medioDeContactoSchema } from "../schemas/medioDeContactoSchema.js";

const claveIdempotenciaSchema = z.uuid().toLowerCase().optional();

export class ColectivoController extends BaseController {
  constructor({ colectivoService, proyectoService, colaboracionService }) {
    super();
    this.colectivoService = colectivoService;
    this.proyectoService = proyectoService;
    this.colaboracionService = colaboracionService;
  }

  crear = async (req, res) => {
    const cuentaId = req.identidad?.sub ?? null;
    res.status(201).json(await this.colectivoService.crear({ ...req.body, cuentaId }));
  };

  listar = async (req, res) => {
    const paginacion = this.aPaginacionDeDominio(req.paginacion);
    const { etiqueta } = req.paginacion;
    this.responderPaginado(res, await this.colectivoService.listar({ ...paginacion, etiqueta }));
  };

  obtenerPorId = async (req, res) => {
    res.status(200).json(await this.colectivoService.buscarPorId(req.params.id));
  };

  actualizar = async (req, res) => {
    res.status(200).json(await this.colectivoService.actualizar(req.params.id, req.body));
  };

  mediosDeContacto = async (req, res) => {
    res.status(200).json(await this.colectivoService.mediosDeContacto(req.params.id));
  };

  agregarMedioDeContacto = async (req, res) => {
    res
      .status(201)
      .json(await this.colectivoService.agregarMedioDeContacto(req.params.id, req.body));
  };

  quitarMedioDeContacto = async (req, res) => {
    const medio = medioDeContactoSchema.parse({
      tipo: req.params.tipo,
      valor: req.params.valor,
    });
    await this.colectivoService.quitarMedioDeContacto(req.params.id, medio);
    res.status(204).send();
  };

  darDeBaja = async (req, res) => {
    res.status(200).json(await this.colectivoService.darDeBaja(req.params.id));
  };

  crearProyecto = async (req, res) => {
    const proyecto = await this.proyectoService.crear({
      ...req.body,
      colectivoId: req.params.id,
      claveIdempotencia: claveIdempotenciaSchema.parse(req.get("Idempotency-Key")),
    });
    res.status(201).json(proyecto);
  };

  listarProyectos = async (req, res) => {
    res.status(200).json(await this.proyectoService.listarPorColectivo(req.params.id));
  };

  timeline = async (req, res) => {
    res.status(200).json(await this.colectivoService.timeline(req.params.id));
  };

  listarValoraciones = async (req, res) => {
    res
      .status(200)
      .json(await this.colaboracionService.listarValoracionesDeColectivo(req.params.id));
  };
}
