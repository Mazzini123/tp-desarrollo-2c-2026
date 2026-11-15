export async function proyectosPorId(colaboraciones, buscar) {
  const ids = [...new Set(colaboraciones.map((c) => String(c.proyectoId)))];
  const proyectos = await buscar(ids);
  return new Map(proyectos.map((p) => [p.id, p]));
}
