import { DuplicadoError } from "../../errors/DuplicadoError.js";

export class RegistroService {
  constructor({ identidadExternaRepository, usuarioRepository, transacciones }) {
    this.transacciones = transacciones;
    this.identidadExternaRepository = identidadExternaRepository;
    this.usuarioRepository = usuarioRepository;
  }

  async registrar({ proveedor, sub }) {
    const registrar = () =>
      this.transacciones.ejecutar(async () => {
        const identidad =
          (await this.identidadExternaRepository.buscar(proveedor, sub)) ??
          (await this.identidadExternaRepository.crear({
            proveedor,
            sub,
            usuarioId: this.usuarioRepository.nuevoId(),
          }));
        return this.usuarioRepository.asegurar(identidad.usuarioId);
      });

    try {
      return await registrar();
    } catch (error) {
      if (!(error instanceof DuplicadoError)) throw error;
      // Mongo puede abortar la transacción al perder la carrera por un índice único.
      return registrar();
    }
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
