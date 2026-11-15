import { createHash } from "node:crypto";
import { MODO_ACEPTACION } from "../domain/enums/MODO_ACEPTACION.js";

export function versionDePerfil(perfil) {
  const camposEditables = [
    String(perfil._id),
    perfil.titulo ?? null,
    perfil.descripcion,
    perfil.compromiso?.cantidadHoras,
    perfil.compromiso?.periodo,
    perfil.modalidadColaboracion,
    perfil.busquedaAbierta ?? true,
    perfil.fechaCierreBusqueda ?? null,
    perfil.limiteColaboraciones ?? null,
    perfil.modoAceptacion ?? MODO_ACEPTACION.REVISION_MANUAL,
    perfil.habilidadesRequeridas.map((h) => h.codigo),
    (perfil.habilidadesOpcionales ?? []).map((h) => h.codigo),
  ];
  return createHash("sha256").update(JSON.stringify(camposEditables)).digest("hex");
}
