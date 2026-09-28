const HABILIDADES_INICIALES = [
  { titulo: "Desarrollo Web React", descripcion: "Frontend con React" },
  { titulo: "Desarrollo Node", descripcion: "Backend con Node.js y Express" },
  { titulo: "Testing E2E con Cypress", descripcion: "Automatizacion de pruebas end-to-end" },
  { titulo: "Diseno UX UI", descripcion: "Diseno de experiencia e interfaz de usuario" },
  { titulo: "Modelado de Datos", descripcion: "Bases de datos relacionales y documentales" },
];

export async function cargarHabilidadesIniciales(habilidadService) {
  const existentes = await habilidadService.listarTodas();
  if (existentes.length > 0) return;

  // for...of en vez de forEach: forEach NO espera a las promesas,
  // dispararia las 5 cargas a la vez y seguiria de largo.
  for (const datos of HABILIDADES_INICIALES) {
    await habilidadService.crear({ ...datos, usuario: "seed" });
  }
}
