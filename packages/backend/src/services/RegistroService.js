export class RegistroService {
  constructor({ identidadExternaRepository, usuarioRepository }) {
    this.identidadExternaRepository = identidadExternaRepository;
    this.usuarioRepository = usuarioRepository;
  }

  async registrar({ proveedor, sub }) {
    const identidad =
      (await this.identidadExternaRepository.buscar(proveedor, sub)) ??
      (await this.identidadExternaRepository.crearSiNoExiste({
        proveedor,
        sub,
        usuarioId: this.usuarioRepository.nuevoId(),
      }));

    return this.usuarioRepository.asegurar(identidad.usuarioId);
  }

  async cambiarNombre(usuario, nombre) {
    const actualizado = await this.usuarioRepository.cambiarNombre(usuario._id, nombre);
    usuario.nombre = actualizado.nombre;
    return { id: actualizado.id, nombre: actualizado.nombre };
  }

  async usuarioDe({ proveedor, sub }) {
    const identidad = await this.identidadExternaRepository.buscar(proveedor, sub);
    return identidad ? this.usuarioRepository.buscarPorId(identidad.usuarioId) : null;
  }
}
