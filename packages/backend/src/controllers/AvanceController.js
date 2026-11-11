export class AvanceController {
  constructor({ avanceService }) {
    this.avanceService = avanceService;
  }

  registrar = async (req, res) => {
    res.status(201).json(await this.avanceService.registrar(req.params.id, req.body));
  };

  listar = async (req, res) => {
    res.status(200).json(await this.avanceService.listar(req.params.id));
  };

  buscarPorId = async (req, res) => {
    res
      .status(200)
      .json(await this.avanceService.buscarPorId(req.params.id, req.params.avanceId));
  };
}
