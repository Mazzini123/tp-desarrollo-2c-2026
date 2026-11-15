export class EstadisticaController {
  constructor({ estadisticaService }) {
    this.estadisticaService = estadisticaService;
  }

  globales = async (_req, res) => {
    res.set("Cache-Control", "public, max-age=60");
    res.status(200).json(await this.estadisticaService.globales());
  };

  deColectivo = async (req, res) => {
    res.status(200).json(await this.estadisticaService.deColectivo(req.params.id));
  };
}
