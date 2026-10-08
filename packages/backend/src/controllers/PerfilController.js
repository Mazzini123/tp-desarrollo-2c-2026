export class PerfilController {
  constructor({ perfilService }) {
    this.perfilService = perfilService;
  }

  crear = async (req, res) => {
    res.status(201).json(await this.perfilService.crear(req.params.id, req.body));
  };

  listar = async (req, res) => {
    res.status(200).json(await this.perfilService.listar(req.params.id));
  };

  obtenerPorId = async (req, res) => {
    res
      .status(200)
      .json(await this.perfilService.buscarPorId(req.params.id, req.params.perfilId));
  };

  actualizar = async (req, res) => {
    res.status(200)
      .json(
        await this.perfilService.actualizar(
          req.params.id,
          req.params.perfilId,
          req.body,
        ),
      );
  };

  eliminar = async (req, res) => {
    await this.perfilService.eliminar(req.params.id, req.params.perfilId);
    res.status(204).send();
  };

  agregarHabilidadRequerida = async (req, res) => {
    const perfil = await this.perfilService.agregarHabilidadRequerida(
      req.params.id,
      req.params.perfilId,
      req.body.codigoHabilidad,
    );
    res.status(200).json(perfil);
  };

  quitarHabilidadRequerida = async (req, res) => {
    const perfil = await this.perfilService.quitarHabilidadRequerida(
      req.params.id,
      req.params.perfilId,
      req.params.codigoHabilidad,
    );
    res.status(200).json(perfil);
  };

  agregarHabilidadOpcional = async (req, res) => {
    const perfil = await this.perfilService.agregarHabilidadOpcional(
      req.params.id,
      req.params.perfilId,
      req.body.codigoHabilidad,
    );
    res.status(200).json(perfil);
  };

  quitarHabilidadOpcional = async (req, res) => {
    const perfil = await this.perfilService.quitarHabilidadOpcional(
      req.params.id,
      req.params.perfilId,
      req.params.codigoHabilidad,
    );
    res.status(200).json(perfil);
  };
}
