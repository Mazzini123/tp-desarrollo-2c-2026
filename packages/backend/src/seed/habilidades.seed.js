import { habilidadService } from "../services/index.js";

/**
 * Carga inicial del catálogo de habilidades. En esta entrega no hay
 * base de datos, así que esto corre en cada arranque del proceso
 * (ver index.js). El enunciado dice que las habilidades "serán
 * precargadas por el equipo administrativo de la plataforma": esto
 * simula esa precarga con datos de ejemplo.
 *
 * En la Segunda Entrega esto se reemplaza por un script de seed real
 * contra MongoDB, que corre una sola vez (no en cada arranque).
 */
const HABILIDADES_INICIALES = [
  { titulo: "Desarrollo Web React", descripcion: "Frontend con React" },
  { titulo: "Desarrollo Node", descripcion: "Backend con Node.js y Express" },
  { titulo: "Testing E2E con Cypress", descripcion: "Automatización de pruebas end-to-end" },
  { titulo: "Diseño UX UI", descripcion: "Diseño de experiencia e interfaz de usuario" },
  { titulo: "Modelado de Datos", descripcion: "Diseño de bases de datos relacionales y documentales" },
];

export function cargarHabilidadesIniciales() {
  const catalogoVacio = habilidadService.listar().length === 0;
  if (!catalogoVacio) return;

  HABILIDADES_INICIALES.forEach((datos) => habilidadService.crear(datos));
}
