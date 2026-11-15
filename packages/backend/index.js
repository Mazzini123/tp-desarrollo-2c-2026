import "dotenv/config";
import mongoose from "mongoose";
import { configuracionDeProceso } from "./src/config/entorno.js";
import { registrarApagado } from "./src/config/apagado.js";
import { componerApp, crearRepositoriosMongo } from "./src/composicion.js";
import { crearApp } from "./src/app.js";
import { cargarHabilidadesIniciales } from "./src/seed/habilidadesSeed.js";
import { asegurarCatalogos } from "./src/security/catalogosSeed.js";
import { asegurarIndices, conectarBaseDeDatos } from "./src/config/db.js";
import {
  asegurarValidadores,
  exigirModeloVigente,
} from "./src/security/persistencia/validadoresDeColecciones.js";
import { ejecutarMigraciones } from "./src/migraciones/ejecutarMigraciones.js";
import { CatalogoDeRoles } from "./src/security/autorizacion/CatalogoDeRoles.js";
import {
  crearAutenticador,
  proveedoresDesdeEntorno,
} from "./src/security/auth/configuracionAuth.js";
import { iniciarCierreAutomatico } from "./src/jobs/cierreAutomatico.js";
import { iniciarEnviosPendientes } from "./src/jobs/enviosPendientes.js";
import { iniciarSeguimiento } from "./src/jobs/seguimiento.js";
import { registro } from "./src/config/registro.js";

const configuracion = configuracionDeProceso();
const port = configuracion.puerto;
const host = "0.0.0.0";

const proveedores = proveedoresDesdeEntorno();

let detenerTareas = [];
try {
  await conectarBaseDeDatos();
  await exigirModeloVigente();
  await asegurarIndices();

  const repositorios = crearRepositoriosMongo();
  const { roles, proveedoresActivos } = await asegurarCatalogos(
    repositorios.catalogoRepository,
    proveedores,
  );
  await asegurarValidadores(repositorios.catalogoRepository);
  await ejecutarMigraciones();

  const autenticador = crearAutenticador(proveedores, proveedoresActivos);
  const compatContextoImplicito = process.env.COMPAT_CONTEXTO_IMPLICITO === "true";
  if (compatContextoImplicito) {
    registro.aviso("compatibilidad_contexto_implicito", {
      detalle:
        "Se aceptan pedidos sin X-Context-Id cuando el usuario tiene un unico contexto " +
        "valido. Apagarla cuando el front mande el encabezado.",
    });
  }

  const { controllers, services, autorizacion } = componerApp({
    repositorios,
    autenticador,
    catalogoDeRoles: new CatalogoDeRoles(roles),
    compatContextoImplicito,
    configuracionAdministracion: {
      diasSinActualizaciones: configuracion.diasSinActualizaciones,
      maxDestacadosActivos: configuracion.maxDestacadosActivos,
    },
  });

  await cargarHabilidadesIniciales(services.habilidadService);

  const detenerCierre = iniciarCierreAutomatico(services.proyectoService, {
    intervaloMs: configuracion.cierreMs,
  });
  const detenerEnvios = iniciarEnviosPendientes(services.notificacionService, {
    avisoAutomaticoService: services.avisoAutomaticoService,
    intervaloMs: configuracion.enviosMs,
  });

  const detenerSeguimiento = iniciarSeguimiento(services.revisionService, {
    intervaloMs: configuracion.seguimientoMs,
  });

  detenerTareas = [detenerCierre, detenerEnvios, detenerSeguimiento];
  const app = crearApp(controllers, { autorizacion });

  const servidor = app.listen(port, host, () => {
    registro.info("api_iniciada", {
      url: `http://${host}:${port}`,
      documentacion: `http://${host}:${port}/docs`,
    });
  });

  const apagar = registrarApagado({
    servidor,
    detenerTareas,
    plazoMs: configuracion.apagadoMs,
  });
  servidor.once("error", (error) => {
    registro.error("servidor_no_disponible", { error: error.message });
    void apagar("error de servidor", 1);
  });
} catch (error) {
  registro.error("arranque_fallido", { error: error.message });
  await Promise.allSettled(detenerTareas.map((detener) => detener()));
  await mongoose.disconnect();
  process.exitCode = 1;
}
