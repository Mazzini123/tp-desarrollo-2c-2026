import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";
import { PROYECTO_ESTADO } from "../domain/enums/PROYECTO_ESTADO.js";

export class EstadisticaService {
  constructor({ estadisticaRepository, colectivoService }) {
    this.estadisticaRepository = estadisticaRepository;
    this.colectivoService = colectivoService;
  }

  async globales(ahora = new Date()) {
    const datos = await this.estadisticaRepository.globales();
    const proyectos = datos.proyectosPorEstado;

    return {
      colectivos: {
        total: datos.colectivos.total,
        activos: datos.colectivos.total - datos.colectivos.dadosDeBaja,
        dadosDeBaja: datos.colectivos.dadosDeBaja,
      },
      proyectos: {
        total: sumar(Object.values(proyectos)),
        abiertos: proyectos[PROYECTO_ESTADO.ABIERTO] ?? 0,
        finalizados: proyectos[PROYECTO_ESTADO.FINALIZADO] ?? 0,
      },
      colaboradores: { total: datos.colaboradores },
      colaboraciones: resumirColaboraciones(datos.colaboraciones),
      habilidadesMasRequeridas: datos.habilidadesMasRequeridas,
      habilidadesMasOfrecidas: datos.habilidadesMasOfrecidas,
      generadoEn: ahora,
    };
  }

  async deColectivo(colectivoId, ahora = new Date()) {
    const colectivo = await this.colectivoService.buscarPorId(colectivoId);
    const { totales, colaboracionesPorEstado, porProyecto } =
      await this.estadisticaRepository.deColectivo(colectivoId);

    const porEstado = (estado) => colaboracionesPorEstado[estado] ?? 0;

    return {
      colectivo: { id: colectivo.id, nombre: colectivo.nombre },
      proyectos: {
        total: totales?.proyectos ?? 0,
        abiertos: totales?.abiertos ?? 0,
        finalizados: (totales?.proyectos ?? 0) - (totales?.abiertos ?? 0),
      },
      colaboraciones: {
        total: sumar(Object.values(colaboracionesPorEstado)),
        pendientes: porEstado(COLABORACION_ESTADO.PENDIENTE),
        aceptadas: porEstado(COLABORACION_ESTADO.ACEPTADA),
        rechazadas: porEstado(COLABORACION_ESTADO.RECHAZADA),
        finalizadas: porEstado(COLABORACION_ESTADO.FINALIZADA),
      },
      visualizaciones: totales?.visualizaciones ?? 0,
      avancePromedio: totales ? Math.round(totales.avancePromedio * 10) / 10 : 0,
      logros: totales?.logros ?? 0,
      porProyecto,
      generadoEn: ahora,
    };
  }
}

function sumar(numeros) {
  return numeros.reduce((total, n) => total + n, 0);
}

function resumirColaboraciones(grupos) {
  const contar = (condicion) => sumar(grupos.filter(condicion).map((g) => g.cantidad));
  const estado = (g) => g.estado;

  return {
    total: contar(() => true),
    pendientes: contar((g) => estado(g) === COLABORACION_ESTADO.PENDIENTE),
    aceptadas: contar((g) => estado(g) === COLABORACION_ESTADO.ACEPTADA),
    rechazadas: contar((g) => estado(g) === COLABORACION_ESTADO.RECHAZADA),
    finalizadas: contar((g) => estado(g) === COLABORACION_ESTADO.FINALIZADA),
    anonimas: contar((g) => g.esPublica === false),
  };
}
