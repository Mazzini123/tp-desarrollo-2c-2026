import { BaseController } from "./BaseController.js";
import { UnauthorizedError } from "../errors/UnauthorizedError.js";

const sinAutenticacion = () =>
  new UnauthorizedError("La autenticacion no esta habilitada o falta la sesion");

export class CuentaController extends BaseController {
  constructor({ registroService, contextoService, membresiaService } = {}) {
    super();
    this.registroService = registroService;
    this.contextoService = contextoService;
    this.membresiaService = membresiaService;
  }

  registrar = async (req, res) => {
    if (!req.autenticacion) throw sinAutenticacion();
    const { usuario, creado } = await this.registroService.registrar(req.autenticacion);
    res.status(creado ? 201 : 200).json({ usuarioId: usuario.id, creado });
  };

  yo = async (req, res) => {
    if (!req.usuario) throw sinAutenticacion();
    res
      .status(200)
      .json(await this.contextoService.cuentaDe(req.usuario, req.identidad.sub));
  };

  cambiarNombre = async (req, res) => {
    res
      .status(200)
      .json(await this.registroService.cambiarNombre(req.usuario, req.body.nombre));
  };

  seleccionarContexto = async (req, res) => {
    res
      .status(200)
      .json(await this.contextoService.seleccionar(req.usuario, req.body.contextoId));
  };

  limpiarContexto = async (req, res) => {
    await this.contextoService.limpiarActual(req.usuario);
    res.status(204).send();
  };

  misSolicitudes = async (req, res) => {
    res.status(200).json(await this.membresiaService.listarDeUsuario(req.usuario));
  };
}
