import { ColectivoRepository } from "./ColectivoRepository.js";
import { ProyectoRepository } from "./ProyectoRepository.js";
import { HabilidadRepository } from "./HabilidadRepository.js";
import { PersonaColaboradoraRepository } from "./PersonaColaboradoraRepository.js";
import { ColaboracionRepository } from "./ColaboracionRepository.js";

/**
 * Instancias únicas (singleton) de cada repositorio, compartidas por
 * toda la aplicación mientras el proceso está vivo. Al pasar a
 * MongoDB en la Segunda Entrega, este archivo es el único lugar que
 * debería cambiar para construir los repositorios reales.
 */
export const colectivoRepository = new ColectivoRepository();
export const proyectoRepository = new ProyectoRepository();
export const habilidadRepository = new HabilidadRepository();
export const personaColaboradoraRepository = new PersonaColaboradoraRepository();
export const colaboracionRepository = new ColaboracionRepository();
