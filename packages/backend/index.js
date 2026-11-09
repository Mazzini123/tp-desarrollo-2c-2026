import "dotenv/config";
import { componerApp } from "./src/composicion.js";
import { crearApp } from "./src/app.js";
import { cargarHabilidadesIniciales } from "./src/seed/habilidadesSeed.js";
import { conectarBaseDeDatos } from "./src/config/db.js";
import { crearVerificadorDesdeEntorno } from "./src/auth/configuracionAuth.js";
import { iniciarCierreAutomatico } from "./src/jobs/cierreAutomatico.js";

const port = process.env.SERVER_PORT || 8000;
const host = "0.0.0.0";

await conectarBaseDeDatos();

const verificadorDeToken = crearVerificadorDesdeEntorno();
const { controllers, services, autorizacion } = componerApp({ verificadorDeToken });

await cargarHabilidadesIniciales(services.habilidadService);

iniciarCierreAutomatico(services.proyectoService, {
  intervaloMs: Number(process.env.CIERRE_AUTOMATICO_INTERVALO_MS) || 60_000,
});

const app = crearApp(controllers, { autorizacion });

app.listen(port, host, () => {
  console.log(`Backend escuchando en http://${host}:${port}`);
  console.log(`Documentacion de la API en http://${host}:${port}/docs`);
});