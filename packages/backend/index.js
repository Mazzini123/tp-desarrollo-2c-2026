import "dotenv/config";
import { componerApp } from "./src/composicion.js";
import { crearApp } from "./src/app.js";
import { cargarHabilidadesIniciales } from "./src/seed/habilidadesSeed.js";
import { conectarBaseDeDatos } from "./src/config/db.js";

const port = process.env.SERVER_PORT || 8000;
const host = "0.0.0.0";

// Conectamos ANTES de componer la app: si la base no responde, es mejor
// que el proceso muera aca y no que atienda pedidos que van a fallar.
await conectarBaseDeDatos();

const { controllers, services } = componerApp();

await cargarHabilidadesIniciales(services.habilidadService);

const app = crearApp(controllers);

app.listen(port, host, () => {
  console.log(`Backend escuchando en http://${host}:${port}`);
  console.log(`Documentacion de la API en http://${host}:${port}/docs`);
});