import { NotFoundError } from "../../errors/NotFoundError.js";

export async function buscarProyectoOFallar(proyectoRepository, proyectoId) {
  const proyecto = await proyectoRepository.buscarPorId(proyectoId);
  if (!proyecto) {
    throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
  }
  return proyecto;
}

export async function buscarPerfilOFallar(proyectoRepository, proyectoId, perfilId) {
  const proyecto = await buscarProyectoOFallar(proyectoRepository, proyectoId);
  const perfil = proyecto.buscarPerfil(perfilId);
  if (!perfil) {
    throw new NotFoundError(
      `No existe un perfil con id "${perfilId}" en el proyecto "${proyectoId}"`,
    );
  }
  return { proyecto, perfil };
}
