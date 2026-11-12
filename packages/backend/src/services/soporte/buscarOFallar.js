import { NotFoundError } from "../../errors/NotFoundError.js";
import { ConflictError } from "../../errors/ConflictError.js";

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

export async function buscarProyectoAbiertoOFallar(proyectoRepository, proyectoId) {
  const proyecto = await buscarProyectoOFallar(proyectoRepository, proyectoId);
  if (!proyecto.estaAbierto()) {
    throw new ConflictError(`El proyecto con id "${proyectoId}" no se encuentra abierto`);
  }
  return proyecto;
}
