import "dotenv/config";
import app from "./src/app.js";
import { cargarHabilidadesIniciales } from "./src/seed/habilidadesSeed.js";

const port = process.env.SERVER_PORT || 8000;
const host = '0.0.0.0';

cargarHabilidadesIniciales();

app.listen(port, host, () => {
  console.log(`Backend escuchando en http://${host}:${port}`);
});
