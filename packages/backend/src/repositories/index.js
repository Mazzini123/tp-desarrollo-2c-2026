import { ColectivoRepository } from "./ColectivoRepository.js";
import { ColaboradorRepository } from "./ColaboradorRepository.js";
import { HabilidadRepository } from "./HabilidadRepository.js";

/**
 * Instancias únicas de cada repositorio, compartidas mientras el
 * proceso está vivo. Al pasar a MongoDB, este archivo es el único
 * lugar que debería cambiar para construir los repositorios reales.
 */
export const colectivoRepository = new ColectivoRepository();
export const colaboradorRepository = new ColaboradorRepository();
export const habilidadRepository = new HabilidadRepository();
