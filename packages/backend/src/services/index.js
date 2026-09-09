import { InMemoryColectivoRepository } from "../repositories/InMemoryColectivoRepository.js";
import { InMemoryColaboradorRepository } from "../repositories/InMemoryColaboradorRepository.js";
import { InMemoryHabilidadRepository } from "../repositories/InMemoryHabilidadRepository.js";
import { ColectivoService } from "./ColectivoService.js";
import { ProyectoService } from "./ProyectoService.js";
import { HabilidadService } from "./HabilidadService.js";
import { ColaboradorService } from "./ColaboradorService.js";
import { ColaboracionService } from "./ColaboracionService.js";

const colectivoRepository = new InMemoryColectivoRepository();
const colaboradorRepository = new InMemoryColaboradorRepository();
const habilidadRepository = new InMemoryHabilidadRepository();

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
