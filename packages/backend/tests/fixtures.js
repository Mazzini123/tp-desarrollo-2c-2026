import { componerApp, crearCanalesEnMemoria } from "../src/composicion.js";
import { cargarHabilidadesIniciales } from "../src/seed/habilidadesSeed.js";
import { vaciarBase } from "./soporte/base.js";
import { MongoProyectoRepository } from "../src/repositories/MongoProyectoRepository.js";

/**
 * Arma un juego de services nuevo para cada test, sobre los repositorios de
 * MongoDB (los mismos que usa la app) con la base vacia y el catalogo de
 * habilidades sembrado. La base la levanta mongodb-memory-server (ver
 * jest.config.js): no hace falta tener un Mongo corriendo.
 *
 * Los canales externos si son dobles en memoria: un test no manda emails.
 */
export async function armarServices() {
  await vaciarBase();
  const canales = crearCanalesEnMemoria();
  const { services } = componerApp({ canales });
  await cargarHabilidadesIniciales(services.habilidadService);
  // Los canales viajan con los services para que un test pueda revisar que
  // se envio (services.canales.EMAIL.enviados), despues de correr el job
  // (services.notificacionService.procesarEnviosPendientes()).
  return { ...services, canales };
}

export const CODIGOS = {
  node: "desarrollo_node",
  react: "desarrollo_web_react",
  cypress: "testing_e2e_con_cypress",
};

export function datosDePerfil({
  requeridas = [CODIGOS.node],
  opcionales = [],
  modoAceptacion = "TODO_SUMA",
  limiteColaboraciones = null,
} = {}) {
  return {
    descripcion: "Perfil de prueba",
    compromiso: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
    codigosHabilidadesRequeridas: requeridas,
    codigosHabilidadesOpcionales: opcionales,
    modoAceptacion,
    limiteColaboraciones,
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

export function proyectosDelColectivo(colectivoId) {
  return new MongoProyectoRepository().buscarPorColectivo(colectivoId);
}
