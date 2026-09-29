import request from "supertest";
import {
  componerApp,
  crearRepositoriosEnMemoria,
  crearCanalesEnMemoria,
} from "../../src/composicion.js";
import { crearApp } from "../../src/app.js";
import { cargarHabilidadesIniciales } from "../../src/seed/habilidadesSeed.js";

/**
 * Levanta la app Express completa (rutas, validacion, middlewares) sobre los
 * repositorios en memoria. supertest le hace pedidos HTTP sin abrir un puerto.
 *
 * Sirve para probar lo que los tests de services no ven: que la ruta exista,
 * que el schema de Zod rechace lo que tiene que rechazar y que la respuesta
 * JSON no muestre lo que no debe.
 */
export async function armarApp() {
  const canales = crearCanalesEnMemoria();
  const { controllers, services } = componerApp({
    repositorios: crearRepositoriosEnMemoria(),
    canales,
  });
  await cargarHabilidadesIniciales(services.habilidadService);
  const app = crearApp(controllers);
  return { api: request(app), services, canales };
}
