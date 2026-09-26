export class PerfilController {
  constructor({ perfilService }) {
    this.perfilService = perfilService;
  }

  crear = (req, res) => {
    res.status(201).json(this.perfilService.crear(req.params.id, req.body));
  };

  listar = (req, res) => {
    res.status(200).json(this.perfilService.listar(req.params.id));
  };

  obtenerPorId = (req, res) => {
    res
      .status(200)
      .json(this.perfilService.buscarPorId(req.params.id, req.params.perfilId));
  };

  actualizar = (req, res) => {
    res.status(200)
      .json(
        this.perfilService.actualizar(
          req.params.id,
          req.params.perfilId,
          req.body,
        ),
      );
  };

  eliminar = (req, res) => {
    this.perfilService.eliminar(req.params.id, req.params.perfilId);
    res.status(204).send();
  };

  agregarHabilidadRequerida = (req, res) => {
    const perfil = this.perfilService.agregarHabilidadRequerida(
      req.params.id,
      req.params.perfilId,
      req.body.codigoHabilidad,
    );
    res.status(200).json(perfil);
  };

  quitarHabilidadRequerida = (req, res) => {
    const perfil = this.perfilService.quitarHabilidadRequerida(
      req.params.id,
      req.params.perfilId,
      req.params.codigoHabilidad,
    );
    res.status(200).json(perfil);
  };

  agregarHabilidadOpcional = (req, res) => {
    const perfil = this.perfilService.agregarHabilidadOpcional(
      req.params.id,
      req.params.perfilId,
      req.body.codigoHabilidad,
    );
    res.status(200).json(perfil);
  };

  quitarHabilidadOpcional = (req, res) => {
    const perfil = this.perfilService.quitarHabilidadOpcional(
      req.params.id,
      req.params.perfilId,
      req.params.codigoHabilidad,
    );
    res.status(200).json(perfil);
  };
}
