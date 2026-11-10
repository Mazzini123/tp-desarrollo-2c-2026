import "dotenv/config";
import { componerApp } from "./src/composicion.js";
import { crearApp } from "./src/app.js";
import { cargarHabilidadesIniciales } from "./src/seed/habilidadesSeed.js";
import { asegurarCatalogos } from "./src/security/catalogosSeed.js";
import { asegurarIndices, conectarBaseDeDatos } from "./src/config/db.js";
import { asegurarValidadores } from "./src/security/persistencia/validadoresDeColecciones.js";
import { ejecutarMigraciones } from "./src/migraciones/ejecutarMigraciones.js";
import { MongoCatalogoRepository } from "./src/security/persistencia/MongoCatalogoRepository.js";
import { CatalogoDeRoles } from "./src/security/autorizacion/CatalogoDeRoles.js";
import {
  crearAutenticador,
  proveedoresDesdeEntorno,
} from "./src/security/auth/configuracionAuth.js";
import { iniciarCierreAutomatico } from "./src/jobs/cierreAutomatico.js";
import { iniciarEnviosPendientes } from "./src/jobs/enviosPendientes.js";

const port = process.env.SERVER_PORT || 8000;
const host = "0.0.0.0";

const proveedores = proveedoresDesdeEntorno();

await conectarBaseDeDatos();
await asegurarValidadores();
await asegurarIndices();

const { roles, proveedoresActivos } = await asegurarCatalogos(
  new MongoCatalogoRepository(),
  proveedores,
);
await ejecutarMigraciones();

const autenticador = crearAutenticador(proveedores, proveedoresActivos);
const compatContextoImplicito = process.env.COMPAT_CONTEXTO_IMPLICITO === "true";
if (compatContextoImplicito) {
  console.warn(
    "COMPAT_CONTEXTO_IMPLICITO activa: se aceptan pedidos sin X-Context-Id cuando el " +
      "usuario tiene un unico contexto valido. Apagarla cuando el front mande el encabezado.",
  );
}

const { controllers, services, autorizacion } = componerApp({
  autenticador,
  catalogoDeRoles: new CatalogoDeRoles(roles),
  compatContextoImplicito,
});

await cargarHabilidadesIniciales(services.habilidadService);

iniciarCierreAutomatico(services.proyectoService, {
  intervaloMs: Number(process.env.CIERRE_AUTOMATICO_INTERVALO_MS) || 60_000,
});
iniciarEnviosPendientes(services.notificacionService, {
  intervaloMs: Number(process.env.ENVIOS_INTERVALO_MS) || 15_000,
});

const app = crearApp(controllers, { autorizacion });

app.listen(port, host, () => {
  console.log(`Backend escuchando en http://${host}:${port}`);
  console.log(`Documentacion de la API en http://${host}:${port}/docs`);
});
