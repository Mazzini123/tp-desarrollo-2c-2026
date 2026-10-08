import "dotenv/config";
import { componerApp } from "./src/composicion.js";
import { crearApp } from "./src/app.js";
import { cargarHabilidadesIniciales } from "./src/seed/habilidadesSeed.js";
import { conectarBaseDeDatos } from "./src/config/db.js";
import { iniciarCierreAutomatico } from "./src/jobs/cierreAutomatico.js";

const port = process.env.SERVER_PORT || 8000;
const host = "0.0.0.0";

// Conectamos ANTES de componer la app: si la base no responde, es mejor
// que el proceso muera aca y no que atienda pedidos que van a fallar.
await conectarBaseDeDatos();

const { controllers, services } = componerApp();

await cargarHabilidadesIniciales(services.habilidadService);

// Revisa cada minuto (configurable) si hay proyectos con la fecha de cierre
// vencida.
iniciarCierreAutomatico(services.proyectoService, {
  intervaloMs: Number(process.env.CIERRE_AUTOMATICO_INTERVALO_MS) || 60_000,
});

const app = crearApp(controllers);

app.listen(port, host, () => {
  console.log(`Backend escuchando en http://${host}:${port}`);
  console.log(`Documentacion de la API en http://${host}:${port}/docs`);
});