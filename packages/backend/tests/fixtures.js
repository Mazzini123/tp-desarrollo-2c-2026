import { componerApp, crearRepositoriosEnMemoria } from "../src/composicion.js";
import { cargarHabilidadesIniciales } from "../src/seed/habilidadesSeed.js";

/**
 * Arma un juego de services nuevo para cada test, con los repositorios en
 * memoria y el catalogo de habilidades ya sembrado.
 *
 * Esta es la razon por la que las implementaciones en memoria NO se borran
 * cuando llegue MongoDB (correccion D2). El profesor dejo la decision colgada
 * de esta condicion: "la de memoria despues se va a borrar, a menos que la
 * necesiten para un test unitario". La necesitamos: sin ella, estos tests
 * requeririan una base levantada.
 *
 * Es async porque el seed lo es: sin el await, el test arrancaria con el
 * catalogo todavia vacio.
 */
export async function armarServices() {
  const { services } = componerApp({ repositorios: crearRepositoriosEnMemoria() });
  await cargarHabilidadesIniciales(services.habilidadService);
  return services;
}

export const CODIGOS = {
  node: "desarrollo_node",
  react: "desarrollo_web_react",
  cypress: "testing_e2e_con_cypress",
};

export function datosDePerfil({ requeridas = [CODIGOS.node], opcionales = [] } = {}) {
  return {
    descripcion: "Perfil de prueba",
    compromiso: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
    codigosHabilidadesRequeridas: requeridas,
    codigosHabilidadesOpcionales: opcionales,
  };
}

export function crearColectivoDePrueba(colectivoService) {
  return colectivoService.crear({
    nombre: "Fundacion Ejemplo",
    descripcion: "Colectivo de prueba",
    tipoColectivo: "FUNDACION",
  });
}

export async function crearProyectoDePrueba(
  { colectivoService, proyectoService },
  { habilidades = [CODIGOS.node], titulo = "Sitio institucional" } = {},
) {
  const colectivo = await crearColectivoDePrueba(colectivoService);
  const proyecto = await proyectoService.crear({
    colectivoId: colectivo.id,
    titulo,
    descripcion: "Proyecto de prueba",
    perfiles: [datosDePerfil({ requeridas: habilidades })],
  });
  return { colectivo, proyecto };
}

export function crearColaboradorDePrueba(
  colaboradorService,
  { habilidades = [CODIGOS.node], cuentaGit = "octocat" } = {},
) {
  return colaboradorService.crear({
    cuentaGit,
    codigosHabilidades: habilidades,
  });
}
