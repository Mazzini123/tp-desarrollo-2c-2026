import "dotenv/config";
import { componerApp } from "./src/composicion.js";
import { crearApp } from "./src/app.js";
import { cargarHabilidadesIniciales } from "./src/seed/habilidadesSeed.js";

const port = process.env.SERVER_PORT || 8000;
const host = "0.0.0.0";

const { controllers, services } = componerApp();

cargarHabilidadesIniciales(services.habilidadService);

const app = crearApp(controllers);

app.listen(port, host, () => {
  console.log(`Backend escuchando en http://${host}:${port}`);
  console.log(`Documentacion de la API en http://${host}:${port}/docs`);
});
