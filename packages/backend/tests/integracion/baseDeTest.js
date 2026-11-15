import { componerApp, crearCanalesEnMemoria } from "../../src/composicion.js";
import { cargarHabilidadesIniciales } from "../../src/seed/habilidadesSeed.js";
import { vaciarBase } from "../soporte/base.js";

/**
 * Tests de integracion: los mismos services y la app, contra MongoDB.
 *
 * Desde que todos los tests usan una base real (mongodb-memory-server, ver
 * jest.config.js), estos solo se distinguen por lo que prueban: indices,
 * transacciones, concurrencia, agregaciones y migraciones.
 */

// La conexion la abre tests/soporte/conexion.js para todos los archivos; se
// conserva la funcion para que los tests digan explicitamente que la usan.
export function usarBaseDeTest() {}

// Antes de cada test: base vacia, indices recreados, catalogo de habilidades
// sembrado y un juego nuevo de services.
export async function armarServicesConMongo() {
  await vaciarBase();
  const canales = crearCanalesEnMemoria();
  const { controllers, services } = componerApp({ canales });
  await cargarHabilidadesIniciales(services.habilidadService);

  return { ...services, canales, controllers };
}
