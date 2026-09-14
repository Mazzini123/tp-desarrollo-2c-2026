const HABILIDADES_INICIALES = [
  { titulo: "Desarrollo Web React", descripcion: "Frontend con React" },
  { titulo: "Desarrollo Node", descripcion: "Backend con Node.js y Express" },
  { titulo: "Testing E2E con Cypress", descripcion: "Automatizacion de pruebas end-to-end" },
  { titulo: "Diseno UX UI", descripcion: "Diseno de experiencia e interfaz de usuario" },
  { titulo: "Modelado de Datos", descripcion: "Bases de datos relacionales y documentales" },
];

/**
 * Correccion B2: recibe el service por parametro en vez de importarlo del
 * contenedor. Era el mismo acoplamiento que B1 en otro disfraz — el seed iba a
 * buscar su dependencia al singleton global.
 *
 * La segunda entrega vuelve sobre esto: "las entidades iniciales se cargaran a
 * traves de scripts semilla (seeds)".
 */
export function cargarHabilidadesIniciales(habilidadService) {
  if (habilidadService.listarTodas().length > 0) return;

  HABILIDADES_INICIALES.forEach((datos) =>
    habilidadService.crear({ ...datos, usuario: "seed" }),
  );
}
