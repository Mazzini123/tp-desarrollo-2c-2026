export class EstadisticaController {
  constructor({ estadisticaService }) {
    this.estadisticaService = estadisticaService;
  }

  // Req. adicional 30: API publica. Se puede cachear un minuto: son numeros
  // agregados, no cambia nada grave si llegan un poco atrasados, y le ahorra
  // consultas a la base.
  globales = async (_req, res) => {
    res.set("Cache-Control", "public, max-age=60");
    res.status(200).json(await this.estadisticaService.globales());
  };

  deColectivo = async (req, res) => {
    res.status(200).json(await this.estadisticaService.deColectivo(req.params.id));
  };
}
