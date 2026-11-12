import { jest } from "@jest/globals";
import { ColaboracionService } from "../../../src/services/ColaboracionService.js";
import { ColaboradorService } from "../../../src/services/ColaboradorService.js";
import { NotFoundError } from "../../../src/errors/NotFoundError.js";
import { ConflictError } from "../../../src/errors/ConflictError.js";
import { DomainError } from "../../../src/errors/DomainError.js";
import { COLABORACION_ESTADO } from "../../../src/domain/enums/COLABORACION_ESTADO.js";
import { MODO_ACEPTACION } from "../../../src/domain/enums/MODO_ACEPTACION.js";
import { TIPO_NOTIFICACION } from "../../../src/domain/enums/TIPO_NOTIFICACION.js";
import {
  colaboracion,
  colaborador,
  habilidad,
  perfil,
  proyecto,
} from "../dobles/entidades.js";
import {
  ProyectoRepositoryEnMemoria,
  notificacionServiceEspia,
  sinTransacciones,
} from "../dobles/repositorios.js";

function armar({ proyectos = [], personas = [] } = {}) {
  const proyectoRepository = new ProyectoRepositoryEnMemoria(proyectos);
  const notificacionService = notificacionServiceEspia();
  const proyectoService = {
    buscarPorId: async (id) => {
      const encontrado = await proyectoRepository.buscarPorId(id);
      if (!encontrado) throw new NotFoundError("No existe ese proyecto");
      return encontrado;
    },
    cerrar: jest.fn(async () => {}),
  };
  const colaboradorService = Object.assign(new ColaboradorService({}), {
    buscarPorId: async (id) => personas.find((p) => p.id === id),
  });
  const service = new ColaboracionService({
    proyectoRepository,
    colaboracionRepository: {},
    colectivoService: {},
    proyectoService,
    colaboradorService,
    notificacionService,
    transacciones: sinTransacciones,
  });
  return { service, proyectoRepository, proyectoService, notificacionService };
}

describe("ColaboracionService · postularse (con dobles)", () => {
  test("en revision manual la postulacion queda pendiente y se guarda", async () => {
    const p = proyecto();
    const ada = colaborador();
    const { service, proyectoRepository } = armar({ proyectos: [p], personas: [ada] });

    const resultado = await service.registrar({
      proyectoId: p.id,
      perfilId: p.perfiles[0].id,
      colaboradorId: ada.id,
    });

    expect(resultado.estado).toBe(COLABORACION_ESTADO.PENDIENTE);
    expect(p.colaboraciones).toEqual([resultado]);
    expect(proyectoRepository.guardar).toHaveBeenCalledWith(p);
  });

  test("con TODO_SUMA la postulacion se acepta en el momento", async () => {
    const p = proyecto({
      perfiles: [perfil({ modoAceptacion: MODO_ACEPTACION.TODO_SUMA })],
    });
    const ada = colaborador();
    const { service } = armar({ proyectos: [p], personas: [ada] });

    const resultado = await service.registrar({
      proyectoId: p.id,
      perfilId: p.perfiles[0].id,
      colaboradorId: ada.id,
    });

    expect(resultado.estado).toBe(COLABORACION_ESTADO.ACEPTADA);
  });

  test("sin las habilidades requeridas responde una regla de negocio y no guarda", async () => {
    const p = proyecto();
    const sinNode = colaborador({ habilidades: [habilidad("react")] });
    const { service, proyectoRepository } = armar({
      proyectos: [p],
      personas: [sinNode],
    });

    await expect(
      service.registrar({
        proyectoId: p.id,
        perfilId: p.perfiles[0].id,
        colaboradorId: sinNode.id,
      }),
    ).rejects.toBeInstanceOf(DomainError);
    expect(proyectoRepository.guardar).not.toHaveBeenCalled();
  });

  test("no se puede postular dos veces al mismo perfil", async () => {
    const ada = colaborador();
    const p = proyecto();
    p.colaboraciones.push(colaboracion({ colaborador: ada, perfil: p.perfiles[0].id }));
    const { service } = armar({ proyectos: [p], personas: [ada] });

    await expect(
      service.registrar({
        proyectoId: p.id,
        perfilId: p.perfiles[0].id,
        colaboradorId: ada.id,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("una colaboradora dada de baja no puede postularse", async () => {
    const p = proyecto();
    const ida = colaborador({ fechaBaja: new Date() });
    const { service } = armar({ proyectos: [p], personas: [ida] });

    await expect(
      service.registrar({
        proyectoId: p.id,
        perfilId: p.perfiles[0].id,
        colaboradorId: ida.id,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("si la fecha de cierre ya paso, cierra el proyecto y rechaza la postulacion", async () => {
    const p = proyecto({ fechaCierre: new Date(Date.now() - 1000) });
    const ada = colaborador();
    const { service, proyectoService } = armar({ proyectos: [p], personas: [ada] });

    await expect(
      service.registrar({
        proyectoId: p.id,
        perfilId: p.perfiles[0].id,
        colaboradorId: ada.id,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(proyectoService.cerrar).toHaveBeenCalledWith(p, expect.any(Date));
  });
});

describe("ColaboracionService · aceptar (con dobles)", () => {
  test("acepta una pendiente y le avisa a la persona", async () => {
    const ada = colaborador();
    const p = proyecto();
    const pendiente = colaboracion({ colaborador: ada, perfil: p.perfiles[0].id });
    p.colaboraciones.push(pendiente);
    const { service, notificacionService } = armar({ proyectos: [p] });

    await service.aceptar(p.id, pendiente.id);

    expect(pendiente.estado).toBe(COLABORACION_ESTADO.ACEPTADA);
    expect(notificacionService.notificar).toHaveBeenCalledTimes(1);
    expect(notificacionService.notificar).toHaveBeenCalledWith(
      ada,
      expect.objectContaining({ tipo: TIPO_NOTIFICACION.POSTULACION_ACEPTADA }),
    );
  });

  test("no acepta si el perfil ya llego a su limite", async () => {
    const p = proyecto({ perfiles: [perfil({ limiteColaboraciones: 1 })] });
    const perfilId = p.perfiles[0].id;
    const pendiente = colaboracion({ colaborador: colaborador(), perfil: perfilId });
    p.colaboraciones.push(
      colaboracion({
        colaborador: colaborador(),
        perfil: perfilId,
        estado: COLABORACION_ESTADO.ACEPTADA,
      }),
      pendiente,
    );
    const { service, notificacionService } = armar({ proyectos: [p] });

    await expect(service.aceptar(p.id, pendiente.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(pendiente.estado).toBe(COLABORACION_ESTADO.PENDIENTE);
    expect(notificacionService.notificar).not.toHaveBeenCalled();
  });
});
