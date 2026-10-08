export class LogroController {
    constructor({ logroService }) {
        this.logroService = logroService
    }

    crearParaProyecto = async (req, res) => {
        res.status(201).json(await this.logroService.crearParaProyecto(req.params.id, req.body));
    }

    conseguirTodosDeProyecto = async (req, res) => {
        res.status(200).json(await this.logroService.conseguirTodosDeProyecto(req.params.id));
    }

    conseguirPorIdParaProyecto = async (req, res) => {
        res.status(200).json(await this.logroService.conseguirPorIdParaProyecto(req.params.id, req.params.logroId));
    }

    actualizarParaProyecto = async (req, res) => {
        res.status(200).json(await this.logroService.actualizarParaProyecto(req.params.id, req.params.logroId, req.body));
    }

    eliminarParaProyecto = async (req, res) => {
        await this.logroService.eliminarParaProyecto(req.params.id, req.params.logroId);
        res.status(204).send();
    }
}