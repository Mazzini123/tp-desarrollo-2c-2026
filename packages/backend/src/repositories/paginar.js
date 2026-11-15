import { salto } from "../utils/paginacion.js";

export async function paginar(
  modelo,
  filtro,
  { numeroPagina, limitePorPagina },
  { orden, ajustar = (consulta) => consulta },
) {
  const [items, total] = await Promise.all([
    ajustar(
      modelo
        .find(filtro)
        .sort(orden)
        .skip(salto(numeroPagina, limitePorPagina))
        .limit(limitePorPagina),
    ),
    modelo.countDocuments(filtro),
  ]);
  return { items, total };
}
