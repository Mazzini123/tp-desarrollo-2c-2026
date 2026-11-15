import request from "supertest";
import { componerApp, crearCanalesEnMemoria } from "../../src/composicion.js";
import { vaciarBase } from "../soporte/base.js";
import { crearApp } from "../../src/app.js";
import { cargarHabilidadesIniciales } from "../../src/seed/habilidadesSeed.js";

// Los tests viejos traen un verificador { verificar(token) -> { sub } }: se
// adapta al contrato del Middleware 1 con un proveedor de prueba.
function autenticadorDesde(verificador) {
  return verificador
    ? {
        async autenticar(token) {
          return { proveedor: "prueba", ...(await verificador.verificar(token)) };
        },
      }
    : null;
}

/**
 * Levanta la app Express completa (rutas, validacion, middlewares) sobre los
 * repositorios de MongoDB, con la base vacia. supertest le hace pedidos HTTP sin abrir un puerto.
 *
 * Sirve para probar lo que los tests de services no ven: que la ruta exista,
 * que el schema de Zod rechace lo que tiene que rechazar y que la respuesta
 * JSON no muestre lo que no debe.
 */
export async function armarApp({
  limites,
  verificadorDeToken = null,
  autenticador = null,
  compatContextoImplicito = false,
} = {}) {
  await vaciarBase();
  const canales = crearCanalesEnMemoria();
  const { controllers, services, autorizacion } = componerApp({
    canales,
    autenticador: autenticador ?? autenticadorDesde(verificadorDeToken),
    compatContextoImplicito,
    avisarContextoImplicito: () => {},
  });
  await cargarHabilidadesIniciales(services.habilidadService);
  // Limites altos por defecto: un test no tiene que chocar contra el rate
  // limit salvo que lo este probando.
  const app = crearApp(controllers, {
    limites: limites ?? { general: 10000, busquedas: 10000 },
    autorizacion,
  });
  return { api: request(app), services, canales };
}
