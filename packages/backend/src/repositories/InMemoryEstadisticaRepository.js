// Doble de test de MongoEstadisticaRepository: calcula lo mismo recorriendo
// los objetos en memoria, con la misma forma de resultado. Lo que prueba es
// el service; los pipelines se prueban contra Mongo (ver la guia del README).
export class InMemoryEstadisticaRepository {
  constructor({ colectivoRepository, colaboradorRepository }) {
    this.colectivoRepository = colectivoRepository;
    this.colaboradorRepository = colaboradorRepository;
  }

  async globales() {
    const colectivos = await this.colectivoRepository.listar();
    const colaboradores = await this.colaboradorRepository.listar();
    const proyectos = colectivos.flatMap((c) => c.proyectos);
    const colaboraciones = proyectos.flatMap((p) => p.colaboraciones);

    const grupos = new Map();
    colaboraciones.forEach(({ estado, esPublica }) => {
      const clave = `${estado}|${esPublica}`;
      const grupo = grupos.get(clave) ?? { estado, esPublica, cantidad: 0 };
      grupo.cantidad += 1;
      grupos.set(clave, grupo);
    });

    return {
      colectivos: {
        total: colectivos.length,
        dadosDeBaja: colectivos.filter((c) => c.estaDadoDeBaja()).length,
      },
      proyectosPorEstado: contarPor(proyectos, (p) => p.estado),
      colaboraciones: [...grupos.values()],
      colaboradores: colaboradores.length,
      habilidadesMasRequeridas: ranking(
        proyectos.flatMap((p) => p.perfiles.flatMap((perfil) => perfil.habilidadesRequeridas)),
      ),
      habilidadesMasOfrecidas: ranking(colaboradores.flatMap((c) => c.habilidades)),
    };
  }

  async deColectivo(colectivoId) {
    const colectivo = await this.colectivoRepository.buscarPorId(colectivoId);
    const proyectos = colectivo?.proyectos ?? [];

    if (proyectos.length === 0) {
      return { totales: null, colaboracionesPorEstado: {}, porProyecto: [] };
    }

    const suma = (f) => proyectos.reduce((total, p) => total + f(p), 0);

    return {
      totales: {
        proyectos: proyectos.length,
        abiertos: proyectos.filter((p) => p.estaAbierto()).length,
        visualizaciones: suma((p) => p.visualizaciones),
        avancePromedio: suma((p) => p.porcentajeConcrecion) / proyectos.length,
        logros: suma((p) => p.logros.length),
      },
      colaboracionesPorEstado: contarPor(
        proyectos.flatMap((p) => p.colaboraciones),
        (c) => c.estado,
      ),
      porProyecto: proyectos
        .map((p) => ({
          id: p.id,
          titulo: p.titulo,
          estado: p.estado,
          visualizaciones: p.visualizaciones,
          porcentajeConcrecion: p.porcentajeConcrecion,
          logros: p.logros.length,
          colaboraciones: p.colaboraciones.length,
        }))
        .sort((a, b) => a.titulo.localeCompare(b.titulo)),
    };
  }
}

function contarPor(lista, clave) {
  return lista.reduce((cuentas, item) => {
    cuentas[clave(item)] = (cuentas[clave(item)] ?? 0) + 1;
    return cuentas;
  }, {});
}

function ranking(habilidades) {
  const cuentas = contarPor(habilidades, (h) => h.codigo);
  return Object.entries(cuentas)
    .map(([codigo, cantidad]) => ({ codigo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.codigo.localeCompare(b.codigo))
    .slice(0, 5);
}
