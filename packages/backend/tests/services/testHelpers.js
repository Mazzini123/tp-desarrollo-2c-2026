import { ColectivoRepository } from "../../src/repositories/ColectivoRepository.js";
import { ProyectoRepository } from "../../src/repositories/ProyectoRepository.js";
import { HabilidadRepository } from "../../src/repositories/HabilidadRepository.js";
import { PersonaColaboradoraRepository } from "../../src/repositories/PersonaColaboradoraRepository.js";
import { ColaboracionRepository } from "../../src/repositories/ColaboracionRepository.js";

import { ColectivoService } from "../../src/services/ColectivoService.js";
import { ProyectoService } from "../../src/services/ProyectoService.js";
import { HabilidadService } from "../../src/services/HabilidadService.js";
import { PersonaColaboradoraService } from "../../src/services/PersonaColaboradoraService.js";
import { ColaboracionService } from "../../src/services/ColaboracionService.js";

import { TipoDeColectivo } from "../../src/domain/enums/TipoDeColectivo.js";
import { UnidadDeCompromiso } from "../../src/domain/enums/UnidadDeCompromiso.js";

export function armarServicios() {
  const colectivoRepository = new ColectivoRepository();
  const proyectoRepository = new ProyectoRepository();
  const habilidadRepository = new HabilidadRepository();
  const personaColaboradoraRepository = new PersonaColaboradoraRepository();
  const colaboracionRepository = new ColaboracionRepository();

  const habilidadService = new HabilidadService({ habilidadRepository });
  const colectivoService = new ColectivoService({ colectivoRepository });
  const proyectoService = new ProyectoService({
    proyectoRepository,
    colectivoService,
    habilidadService,
  });
  const personaColaboradoraService = new PersonaColaboradoraService({
    personaColaboradoraRepository,
    habilidadService,
  });
  const colaboracionService = new ColaboracionService({
    colaboracionRepository,
    proyectoService,
    personaColaboradoraService,
  });

  return {
    habilidadService,
    colectivoService,
    proyectoService,
    personaColaboradoraService,
    colaboracionService,
  };
}

export function crearColectivoDeEjemplo(colectivoService, overrides = {}) {
  return colectivoService.crear({
    nombre: "Fundación Ejemplo",
    descripcion: "Trabajamos por una causa",
    tipo: TipoDeColectivo.FUNDACION,
    ...overrides,
  });
}

export function crearProyectoDeEjemplo(proyectoService, colectivoId, overrides = {}) {
  return proyectoService.crear({
    titulo: "Sitio institucional",
    descripcion: "Rediseño del sitio",
    colectivoId,
    compromisoEsperado: { unidad: UnidadDeCompromiso.HORAS_SEMANALES, cantidadHoras: 5 },
    modalidadColaboracion: {},
    habilidadesRequeridas: ["desarrollo_web_react"],
    ...overrides,
  });
}

export function crearPersonaDeEjemplo(personaColaboradoraService, overrides = {}) {
  return personaColaboradoraService.crear({
    nombreDeFantasia: "ByteRunner",
    datosDeContacto: "byte@example.com",
    habilidades: [],
    ...overrides,
  });
}
