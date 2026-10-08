export class AvanceController {
    constructor({ avanceService }) {
        this.avanceService = avanceService;
    }

    registrarAvanceParaProyecto = async (req, res) => {
        res.status(201).json(await this.avanceService.registrarAvanceParaProyecto(req.params.id, req.body));
    }

    listarParaProyecto = async (req, res) => {
        res.status(200).json(await this.avanceService.listarParaProyecto(req.params.id));
    }

    buscarPorIdParaProyecto = async (req, res) => {
        res.status(200).json(await this.avanceService.buscarPorIdParaProyecto(req.params.id, req.params.avanceId));
    }
}