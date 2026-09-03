import "dotenv/config";
import app from "./src/app.js";
import { cargarHabilidadesIniciales } from "./src/seed/habilidades.seed.js";

const port = process.env.SERVER_PORT || 8000;

cargarHabilidadesIniciales();

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
