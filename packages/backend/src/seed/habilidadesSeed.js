import { habilidadService } from "../services/index.js";

const HABILIDADES_INICIALES = [
  { titulo: "Desarrollo Web React", descripcion: "Frontend con React" },
  { titulo: "Desarrollo Node", descripcion: "Backend con Node.js y Express" },
  { titulo: "Testing E2E con Cypress", descripcion: "Automatización de pruebas end-to-end" },
  { titulo: "Diseño UX UI", descripcion: "Diseño de experiencia e interfaz de usuario" },
  { titulo: "Modelado de Datos", descripcion: "Bases de datos relacionales y documentales" },
];

export function cargarHabilidadesIniciales() {
  if (habilidadService.listarTodas().length > 0) return;

  HABILIDADES_INICIALES.forEach((datos) =>
    habilidadService.crear({ ...datos, usuario: "seed" }),
  );
}
