import { jest } from "@jest/globals";
import { ProyectoService } from "../../../src/services/ProyectoService.js";
import { ConflictError } from "../../../src/errors/ConflictError.js";
import { DomainError } from "../../../src/errors/DomainError.js";
import { PROYECTO_ESTADO } from "../../../src/domain/enums/PROYECTO_ESTADO.js";
import { COLABORACION_ESTADO } from "../../../src/domain/enums/COLABORACION_ESTADO.js";
import {
  colaboracion,
  colaborador,
  colectivo,
  perfil,
  proyecto,
} from "../dobles/entidades.js";
import {
  ProyectoRepositoryEnMemoria,
  notificacionServiceEspia,
  sinTransacciones,
} from "../dobles/repositorios.js";

function armar({ proyectos = [], dueno = colectivo() } = {}) {
  const proyectoRepository = new ProyectoRepositoryEnMemoria(proyectos);
  const avisoAutomaticoService = { avisarPorProyectoNuevo: jest.fn(async () => {}) };
  const notificacionService = notificacionServiceEspia();
  const service = new ProyectoService({
    proyectoRepository,
    colaboracionRepository: {},
    colectivoService: { buscarPorId: async () => dueno },
    perfilService: { construirPerfil: async (datos) => perfil(datos) },
    notificacionService,
    avisoAutomaticoService,
    transacciones: sinTransacciones,
  });
  return {
    service,
    proyectoRepository,
    avisoAutomaticoService,
    notificacionService,
    dueno,
  };
}

const datosDeProyecto = (cambios = {}) => ({
  titulo: "Sitio",
  descripcion: "d",
  perfiles: [{ descripcion: "Backend" }],
  ...cambios,
});

describe("ProyectoService · publicar (con dobles)", () => {
  test("guarda el proyecto con sus perfiles y encola el aviso a las personas compatibles", async () => {
    const { service, proyectoRepository, avisoAutomaticoService, dueno } = armar();

    const creado = await service.crear(datosDeProyecto({ colectivoId: dueno.id }));

    expect(creado.perfiles).toHaveLength(1);
    expect(creado.colectivoId).toBe(dueno._id);
    expect(proyectoRepository.guardar).toHaveBeenCalledWith(creado);
    expect(avisoAutomaticoService.avisarPorProyectoNuevo).toHaveBeenCalledWith(creado);
  });

  test("un colectivo dado de baja no puede publicar", async () => {
    const { service, proyectoRepository, avisoAutomaticoService, dueno } = armar({
      dueno: colectivo({ fechaBaja: new Date() }),
    });

    await expect(
      service.crear(datosDeProyecto({ colectivoId: dueno.id })),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(proyectoRepository.guardar).not.toHaveBeenCalled();
    expect(avisoAutomaticoService.avisarPorProyectoNuevo).not.toHaveBeenCalled();
  });

  test("una fecha de cierre pasada es una regla de negocio (422)", async () => {
    const { service, dueno } = armar();

    const error = await service
      .crear(datosDeProyecto({ colectivoId: dueno.id, fechaCierre: new Date(0) }))
      .catch((e) => e);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.status).toBe(422);
  });
});

describe("ProyectoService · finalizar (con dobles)", () => {
  test("finaliza las aceptadas, rechaza las pendientes y avisa a cada persona", async () => {
    const p = proyecto();
    const perfilId = p.perfiles[0].id;
    const aceptada = colaboracion({
      colaborador: colaborador(),
      perfil: perfilId,
      estado: COLABORACION_ESTADO.ACEPTADA,
    });
    const pendiente = colaboracion({ colaborador: colaborador(), perfil: perfilId });
    p.colaboraciones.push(aceptada, pendiente);
    const { service, notificacionService } = armar({ proyectos: [p] });

    await service.finalizar(p.id);

    expect(p.estado).toBe(PROYECTO_ESTADO.FINALIZADO);
    expect(aceptada.estado).toBe(COLABORACION_ESTADO.FINALIZADA);
    expect(pendiente.estado).toBe(COLABORACION_ESTADO.RECHAZADA);
    expect(notificacionService.notificar).toHaveBeenCalledTimes(2);
  });

  test("no se puede finalizar dos veces", async () => {
    const p = proyecto({ estado: PROYECTO_ESTADO.FINALIZADO });
    const { service, proyectoRepository } = armar({ proyectos: [p] });

    await expect(service.finalizar(p.id)).rejects.toBeInstanceOf(ConflictError);
    expect(proyectoRepository.guardar).not.toHaveBeenCalled();
  });
});
