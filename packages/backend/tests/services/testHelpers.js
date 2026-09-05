import { ColectivoRepository } from "../../src/repositories/ColectivoRepository.js";
import { ColaboradorRepository } from "../../src/repositories/ColaboradorRepository.js";
import { HabilidadRepository } from "../../src/repositories/HabilidadRepository.js";

import { ColectivoService } from "../../src/services/ColectivoService.js";
import { ProyectoService } from "../../src/services/ProyectoService.js";
import { HabilidadService } from "../../src/services/HabilidadService.js";
import { ColaboradorService } from "../../src/services/ColaboradorService.js";
import { ColaboracionService } from "../../src/services/ColaboracionService.js";

import { TIPO_COLECTIVO } from "../../src/domain/enums/TipoColectivo.js";
import { PERIODO_COMPROMISO } from "../../src/domain/enums/PeriodoCompromiso.js";

/**
 * Cada test arma su propio grafo de dependencias en vez de usar los
 * singletons de src/services/index.js, para no compartir estado.
 */
export function armarServicios() {
  const colectivoRepository = new ColectivoRepository();
  const colaboradorRepository = new ColaboradorRepository();
  const habilidadRepository = new HabilidadRepository();

  const habilidadService = new HabilidadService({ habilidadRepository });
  const colectivoService = new ColectivoService({ colectivoRepository });
  const proyectoService = new ProyectoService({
    colectivoRepository,
    colectivoService,
    habilidadService,
  });
  const colaboradorService = new ColaboradorService({
    colaboradorRepository,
    habilidadService,
  });
  const colaboracionService = new ColaboracionService({
    colectivoRepository,
    proyectoService,
    colaboradorService,
  });

  return {
    habilidadService,
    colectivoService,
    proyectoService,
    colaboradorService,
    colaboracionService,
  };
}

export function prepararCatalogo(habilidadService) {
  habilidadService.crear({ titulo: "Desarrollo Web React", descripcion: "" });
  habilidadService.crear({ titulo: "Desarrollo Node", descripcion: "" });
}

export function crearColectivoDeEjemplo(colectivoService, overrides = {}) {
  return colectivoService.crear({
    nombre: "Fundación Ejemplo",
    descripcion: "Trabajamos por una causa",
    tipoColectivo: TIPO_COLECTIVO.FUNDACION,
    ...overrides,
  });
}

export function crearProyectoDeEjemplo(proyectoService, colectivoId, overrides = {}) {
  return proyectoService.crear({
    colectivoId,
    titulo: "Sitio institucional",
    descripcion: "Rediseño del sitio",
    compromisoEsperado: { cantidadHoras: 5, periodo: PERIODO_COMPROMISO.HS_SEMANALES },
    modalidadColaboracion: {},
    habilidadesNecesarias: ["desarrollo_web_react"],
    ...overrides,
  });
}

export function crearColaboradorDeEjemplo(colaboradorService, overrides = {}) {
  return colaboradorService.crear({
    nombreFantasia: "ByteRunner",
    habilidades: [],
    ...overrides,
  });
}
