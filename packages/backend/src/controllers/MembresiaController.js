import { BaseController } from "./BaseController.js";

export class MembresiaController extends BaseController {
  constructor({ membresiaService, liderazgoService }) {
    super();
    this.membresiaService = membresiaService;
    this.liderazgoService = liderazgoService;
  }

  solicitar = async (req, res) => {
    res
      .status(201)
      .json(await this.membresiaService.solicitarIngreso(req.usuario, req.params.id));
  };

  cancelar = async (req, res) => {
    res
      .status(200)
      .json(
        await this.membresiaService.cancelar(
          req.usuario,
          req.params.id,
          req.params.solicitudId,
        ),
      );
  };

  listarSolicitudes = async (req, res) => {
    res.status(200).json(
      await this.membresiaService.listarDeColectivo(req.params.id, {
        estado: req.consulta?.estado,
      }),
    );
  };

  aceptar = async (req, res) => {
    res
      .status(200)
      .json(
        await this.membresiaService.aceptar(
          req.contexto,
          req.params.id,
          req.params.solicitudId,
        ),
      );
  };

  rechazar = async (req, res) => {
    res
      .status(200)
      .json(
        await this.membresiaService.rechazar(
          req.contexto,
          req.params.id,
          req.params.solicitudId,
        ),
      );
  };

  listarMiembros = async (req, res) => {
    res.status(200).json(await this.membresiaService.listarMiembros(req.params.id));
  };

  quitarMiembro = async (req, res) => {
    await this.membresiaService.quitarMiembro(
      req.contexto,
      req.params.id,
      req.params.contextoId,
    );
    res.status(204).send();
  };

  abandonar = async (req, res) => {
    await this.membresiaService.abandonar(req.contexto, req.params.id);
    res.status(204).send();
  };

  transferirLiderazgo = async (req, res) => {
    res
      .status(200)
      .json(
        await this.liderazgoService.transferir(
          req.contexto,
          req.params.id,
          req.body.contextoId,
        ),
      );
  };
}
