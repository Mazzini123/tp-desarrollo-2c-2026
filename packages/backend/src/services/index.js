import {
  colectivoRepository,
  proyectoRepository,
  habilidadRepository,
  personaColaboradoraRepository,
  colaboracionRepository,
} from "../repositories/index.js";
import { ColectivoService } from "./ColectivoService.js";
import { ProyectoService } from "./ProyectoService.js";
import { HabilidadService } from "./HabilidadService.js";
import { PersonaColaboradoraService } from "./PersonaColaboradoraService.js";
import { ColaboracionService } from "./ColaboracionService.js";

/**
 * Composition root de la capa de servicios: arma cada servicio con
 * los repositorios (y otros servicios) de los que depende, todo
 * como singletons. Los controllers importan de acá, nunca instancian
 * un service directamente.
 */
export const habilidadService = new HabilidadService({ habilidadRepository });

export const colectivoService = new ColectivoService({ colectivoRepository });

export const proyectoService = new ProyectoService({
  proyectoRepository,
  colectivoService,
  habilidadService,
});

export const personaColaboradoraService = new PersonaColaboradoraService({
  personaColaboradoraRepository,
  habilidadService,
});

export const colaboracionService = new ColaboracionService({
  colaboracionRepository,
  proyectoService,
  personaColaboradoraService,
});
