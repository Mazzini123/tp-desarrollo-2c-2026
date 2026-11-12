import { ConflictError } from "../errors/ConflictError.js";
import { AUTOR_VALORACION } from "../domain/enums/AUTOR_VALORACION.js";
import { proyectosPorId } from "./soporte/proyectosPorId.js";

export class ValoracionService {
  constructor({
    colaboracionService,
    colaboracionRepository,
    proyectoRepository,
    colectivoService,
    colaboradorService,
  }) {
    Object.assign(this, {
      colaboracionService,
      colaboracionRepository,
      proyectoRepository,
      colectivoService,
      colaboradorService,
    });
  }
  async valorar(
    proyectoId,
    colaboracionId,
    { autor, puntaje, comentario },
    ahora = new Date(),
  ) {
    const { proyecto, colaboracion } = await this.colaboracionService.buscarColaboracion(
      proyectoId,
      colaboracionId,
    );

    if (!colaboracion.estaFinalizada()) {
      throw new ConflictError("Solo se puede valorar una colaboracion finalizada");
    }

    const campo =
      autor === AUTOR_VALORACION.COLECTIVO
        ? "valoracionDelColectivo"
        : "valoracionDelColaborador";

    if (colaboracion[campo] !== null) {
      throw new ConflictError("Esa parte ya valoro esta colaboracion");
    }

    colaboracion[campo] = { puntaje, comentario, fecha: ahora };
    await this.proyectoRepository.guardar(proyecto);

    return colaboracion[campo];
  }

  async listarValoracionesDeColaborador(colaboradorId) {
    await this.colaboradorService.buscarPorId(colaboradorId);
    const colaboraciones =
      await this.colaboracionRepository.valoradasPorColectivos(colaboradorId);
    const proyectos = await this.proyectosDe(colaboraciones);

    const valoraciones = colaboraciones.map((c) => {
      const proyecto = proyectos.get(String(c.proyectoId));
      return {
        colectivo: { id: proyecto.colectivo.id, nombre: proyecto.colectivo.nombre },
        proyecto: { id: proyecto.id, titulo: proyecto.titulo },
        ...c.valoracionDelColectivo.toObject(),
      };
    });

    return resumirValoraciones(valoraciones);
  }

  async listarValoracionesDeColectivo(colectivoId) {
    await this.colectivoService.buscarPorId(colectivoId);
    const colaboraciones =
      await this.colaboracionRepository.valoradasPorColaboradoras(colectivoId);
    const proyectos = await this.proyectosDe(colaboraciones);

    const valoraciones = colaboraciones.map((c) => {
      const proyecto = proyectos.get(String(c.proyectoId));
      return {
        proyecto: { id: proyecto.id, titulo: proyecto.titulo },
        autor: c.esPublica ? c.colaborador : null,
        ...c.valoracionDelColaborador.toObject(),
      };
    });

    return resumirValoraciones(valoraciones);
  }

  async proyectosDe(colaboraciones) {
    return proyectosPorId(colaboraciones, (ids) =>
      this.proyectoRepository.buscarTitulos(ids),
    );
  }
}

function resumirValoraciones(valoraciones) {
  const cantidad = valoraciones.length;
  const suma = valoraciones.reduce((total, v) => total + v.puntaje, 0);

  return {
    cantidad,
    promedio: cantidad === 0 ? null : Math.round((suma / cantidad) * 10) / 10,
    valoraciones: valoraciones.sort((a, b) => b.fecha - a.fecha),
  };
}
