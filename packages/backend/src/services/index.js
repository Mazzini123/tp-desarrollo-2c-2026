import {
  colectivoRepository,
  colaboradorRepository,
  habilidadRepository,
} from "../repositories/index.js";
import { ColectivoService } from "./ColectivoService.js";
import { ProyectoService } from "./ProyectoService.js";
import { HabilidadService } from "./HabilidadService.js";
import { ColaboradorService } from "./ColaboradorService.js";
import { ColaboracionService } from "./ColaboracionService.js";

/**
 * Composition root de la capa de servicios: arma cada servicio con
 * los repositorios (y servicios) de los que depende. Los controllers
 * importan de acá, nunca instancian un service directamente.
 */
export const habilidadService = new HabilidadService({ habilidadRepository });

export const colectivoService = new ColectivoService({ colectivoRepository });

export const proyectoService = new ProyectoService({
  colectivoRepository,
  colectivoService,
  habilidadService,
});

export const colaboradorService = new ColaboradorService({
  colaboradorRepository,
  habilidadService,
});

export const colaboracionService = new ColaboracionService({
  colectivoRepository,
  proyectoService,
  colaboradorService,
});
