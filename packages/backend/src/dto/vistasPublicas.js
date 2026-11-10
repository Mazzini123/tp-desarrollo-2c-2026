import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";

const VISIBLES = new Set([COLABORACION_ESTADO.ACEPTADA, COLABORACION_ESTADO.FINALIZADA]);

const aJSON = (documento) =>
  typeof documento?.toJSON === "function" ? documento.toJSON() : documento;

export function proyectoPublico(proyecto) {
  const json = aJSON(proyecto);
  return {
    ...json,
    colaboraciones: (json.colaboraciones ?? []).filter((c) => VISIBLES.has(c.estado)),
  };
}

export function colectivoPublico(colectivo) {
  const json = aJSON(colectivo);
  return { ...json, proyectos: (json.proyectos ?? []).map(proyectoPublico) };
}

export function paginaPublica(pagina, vista) {
  return { ...pagina, items: pagina.items.map(vista) };
}
