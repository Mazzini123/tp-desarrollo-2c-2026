export class LogroController {
  constructor({ logroService }) {
    this.logroService = logroService;
  }

  crear = async (req, res) => {
    res.status(201).json(await this.logroService.crear(req.params.id, req.body));
  };

  listar = async (req, res) => {
    res.status(200).json(await this.logroService.listar(req.params.id));
  };

  buscarPorId = async (req, res) => {
    res
      .status(200)
      .json(await this.logroService.buscarPorId(req.params.id, req.params.logroId));
  };

  actualizar = async (req, res) => {
    res
      .status(200)
      .json(
        await this.logroService.actualizar(req.params.id, req.params.logroId, req.body),
      );
  };

  eliminar = async (req, res) => {
    await this.logroService.eliminar(req.params.id, req.params.logroId);
    res.status(204).send();
  };
}
