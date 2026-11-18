import { jest } from "@jest/globals";
import { ColaboracionService } from "../../../src/services/ColaboracionService.js";
import { ColaboradorService } from "../../../src/services/ColaboradorService.js";
import { NotFoundError } from "../../../src/errors/NotFoundError.js";
import { ConflictError } from "../../../src/errors/ConflictError.js";
import { DomainError } from "../../../src/errors/DomainError.js";
import { COLABORACION_ESTADO } from "../../../src/domain/enums/COLABORACION_ESTADO.js";
import { MODO_ACEPTACION } from "../../../src/domain/enums/MODO_ACEPTACION.js";
import { TIPO_NOTIFICACION } from "../../../src/domain/enums/TIPO_NOTIFICACION.js";
import { ROL } from "../../../src/security/autorizacion/enums/ROL.js";
import {
  colaboracion,
  colaborador,
  contextoDeColaboradora,
  contextoDeColectivo,
  habilidad,
  nuevoId,
  perfil,
  proyecto,
} from "../dobles/entidades.js";
import {
  ContextoUsuarioRepositoryEnMemoria,
  ProyectoRepositoryEnMemoria,
  notificacionServiceEspia,
  sinTransacciones,
  usuarioRepositoryEspia,
} from "../dobles/repositorios.js";

function armar({ proyectos = [], personas = [], contextos = [] } = {}) {
  const proyectoRepository = new ProyectoRepositoryEnMemoria(proyectos);
  const notificacionService = notificacionServiceEspia();
  const contextoUsuarioRepository = new ContextoUsuarioRepositoryEnMemoria(contextos);
  const usuarioRepository = usuarioRepositoryEspia();
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
    contextoUsuarioRepository,
    usuarioRepository,
    transacciones: sinTransacciones,
  });
  return {
    service,
    proyectoRepository,
    proyectoService,
    notificacionService,
    contextoUsuarioRepository,
    usuarioRepository,
  };
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

    const error = await service
      .registrar({
        proyectoId: p.id,
        perfilId: p.perfiles[0].id,
        colaboradorId: sinNode.id,
      })
      .catch((e) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.codigo).toBe("HABILIDADES_REQUERIDAS_FALTANTES");
    expect(proyectoRepository.guardar).not.toHaveBeenCalled();
  });

  test("no se puede postular dos veces al mismo perfil", async () => {
    const ada = colaborador();
    const p = proyecto();
    p.colaboraciones.push(colaboracion({ colaborador: ada, perfil: p.perfiles[0].id }));
    const { service } = armar({ proyectos: [p], personas: [ada] });

    const error = await service
      .registrar({
        proyectoId: p.id,
        perfilId: p.perfiles[0].id,
        colaboradorId: ada.id,
      })
      .catch((e) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.codigo).toBe("POSTULACION_EXISTENTE");
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

describe("ColaboracionService · postularse al colectivo propio (con dobles)", () => {
  function cuentaConPerfil(p, { rol, activo = true, colectivoId = p.colectivoId } = {}) {
    const ada = colaborador();
    const usuarioId = nuevoId();
    const contextos = [
      contextoDeColaboradora({ usuarioId, colaboradorId: ada.id }),
      contextoDeColectivo({ usuarioId, colectivoId, rol, activo }),
    ];
    return { ada, usuarioId, contextos };
  }

  const postular = (service, p, ada) =>
    service.registrar({
      proyectoId: p.id,
      perfilId: p.perfiles[0].id,
      colaboradorId: ada.id,
    });

  test.each([ROL.LIDER, ROL.MIEMBRO])(
    "una cuenta que es %s activa del colectivo del proyecto recibe 422 y no se guarda nada",
    async (rol) => {
      const p = proyecto();
      const { ada, contextos } = cuentaConPerfil(p, { rol });
      const { service, proyectoRepository, notificacionService } = armar({
        proyectos: [p],
        personas: [ada],
        contextos,
      });

      const error = await postular(service, p, ada).catch((e) => e);

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toMatchObject({
        status: 422,
        codigo: "POSTULACION_EN_COLECTIVO_PROPIO",
      });
      expect(proyectoRepository.guardar).not.toHaveBeenCalled();
      expect(notificacionService.notificar).not.toHaveBeenCalled();
      expect(p.colaboraciones).toHaveLength(0);
    },
  );

  test("quien salio del colectivo (contexto inactivo) se puede postular", async () => {
    const p = proyecto();
    const { ada, contextos } = cuentaConPerfil(p, { rol: ROL.MIEMBRO, activo: false });
    const { service } = armar({ proyectos: [p], personas: [ada], contextos });

    const resultado = await postular(service, p, ada);

    expect(resultado.estado).toBe(COLABORACION_ESTADO.PENDIENTE);
  });

  test("participar en otro colectivo no impide postularse", async () => {
    const p = proyecto();
    const { ada, contextos } = cuentaConPerfil(p, {
      rol: ROL.LIDER,
      colectivoId: nuevoId(),
    });
    const { service, proyectoRepository } = armar({
      proyectos: [p],
      personas: [ada],
      contextos,
    });

    await postular(service, p, ada);

    expect(proyectoRepository.guardar).toHaveBeenCalledWith(p);
  });

  test("una colaboradora sin contexto asociado no se ve afectada ni bloquea a nadie", async () => {
    const p = proyecto();
    const ada = colaborador();
    const { service, usuarioRepository, contextoUsuarioRepository } = armar({
      proyectos: [p],
      personas: [ada],
    });

    const resultado = await postular(service, p, ada);

    expect(resultado.estado).toBe(COLABORACION_ESTADO.PENDIENTE);
    expect(contextoUsuarioRepository.buscarDeColaborador).toHaveBeenCalledWith(ada.id);
    expect(usuarioRepository.bloquear).not.toHaveBeenCalled();
    expect(contextoUsuarioRepository.buscarDeUsuarioEnColectivo).not.toHaveBeenCalled();
  });

  test("bloquea al usuario antes de consultar su membresia en el colectivo", async () => {
    const p = proyecto();
    const { ada, usuarioId, contextos } = cuentaConPerfil(p, { rol: ROL.MIEMBRO });
    const { service, usuarioRepository, contextoUsuarioRepository } = armar({
      proyectos: [p],
      personas: [ada],
      contextos,
    });

    await postular(service, p, ada).catch(() => {});

    expect(usuarioRepository.bloquear).toHaveBeenCalledWith(usuarioId);
    expect(contextoUsuarioRepository.buscarDeUsuarioEnColectivo).toHaveBeenCalledWith(
      usuarioId,
      p.colectivoId,
    );
    expect(usuarioRepository.bloquear.mock.invocationCallOrder[0]).toBeLessThan(
      contextoUsuarioRepository.buscarDeUsuarioEnColectivo.mock.invocationCallOrder[0],
    );
  });

  test("la regla se aplica aunque el proyecto este cerrado por fecha, sin cerrarlo", async () => {
    const p = proyecto({ fechaCierre: new Date(Date.now() - 1000) });
    const { ada, contextos } = cuentaConPerfil(p, { rol: ROL.LIDER });
    const { service, proyectoService } = armar({
      proyectos: [p],
      personas: [ada],
      contextos,
    });

    await expect(postular(service, p, ada)).rejects.toMatchObject({
      codigo: "POSTULACION_EN_COLECTIVO_PROPIO",
    });
    expect(proyectoService.cerrar).not.toHaveBeenCalled();
  });
});
