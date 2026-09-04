import { habilidadService } from "../services/index.js";

/**
 * Carga inicial del catálogo de habilidades. En esta entrega no hay
 * base de datos, así que corre en cada arranque del proceso (ver
 * index.js). El enunciado indica que las habilidades "serán
 * precargadas por el equipo administrativo": esto simula esa
 * precarga.
 *
 * En la Segunda Entrega se reemplaza por un script de seed real
 * contra MongoDB, que corre una sola vez.
 */
const HABILIDADES_INICIALES = [
  { titulo: "Desarrollo Web React", descripcion: "Frontend con React" },
  { titulo: "Desarrollo Node", descripcion: "Backend con Node.js y Express" },
  { titulo: "Testing E2E con Cypress", descripcion: "Automatización de pruebas end-to-end" },
  { titulo: "Diseño UX UI", descripcion: "Diseño de experiencia e interfaz de usuario" },
  { titulo: "Modelado de Datos", descripcion: "Bases de datos relacionales y documentales" },
];

export function cargarHabilidadesIniciales() {
  if (habilidadService.listar().length > 0) return;

  HABILIDADES_INICIALES.forEach((datos) =>
    habilidadService.crear({ ...datos, usuario: "seed" }),
  );
}
