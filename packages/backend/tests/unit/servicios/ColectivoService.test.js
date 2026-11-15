import { ColectivoService } from "../../../src/services/ColectivoService.js";
import { ConflictError } from "../../../src/errors/ConflictError.js";
import { PROYECTO_ESTADO } from "../../../src/domain/enums/PROYECTO_ESTADO.js";
import { COLABORACION_ESTADO } from "../../../src/domain/enums/COLABORACION_ESTADO.js";
import { colaboracion, colaborador, colectivo, proyecto } from "../dobles/entidades.js";
import {
  ColectivoRepositoryEnMemoria,
  ProyectoRepositoryEnMemoria,
  notificacionServiceEspia,
  sinTransacciones,
} from "../dobles/repositorios.js";

function armar({ colectivos = [], proyectos = [] } = {}) {
  const colectivoRepository = new ColectivoRepositoryEnMemoria(colectivos);
  const proyectoRepository = new ProyectoRepositoryEnMemoria(proyectos);
  const notificacionService = notificacionServiceEspia();
  const service = new ColectivoService({
    colectivoRepository,
    proyectoRepository,
    notificacionService,
    transacciones: sinTransacciones,
  });
  return { service, colectivoRepository, proyectoRepository, notificacionService };
}

describe("ColectivoService · medios de contacto (con dobles)", () => {
  test("no registra dos veces el mismo medio", async () => {
    const c = colectivo({ mediosDeContacto: [{ tipo: "EMAIL", valor: "a@b.com" }] });
    const { service, colectivoRepository } = armar({ colectivos: [c] });

    await expect(
      service.agregarMedioDeContacto(c.id, { tipo: "EMAIL", valor: "a@b.com" }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(colectivoRepository.guardar).not.toHaveBeenCalled();
  });
});

describe("ColectivoService · actualizar (con dobles)", () => {
  test("cambiar el nombre actualiza la copia guardada en sus proyectos", async () => {
    const c = colectivo();
    const { service, proyectoRepository } = armar({ colectivos: [c] });

    await service.actualizar(c.id, { nombre: "Nuevo nombre" });

    expect(c.nombre).toBe("Nuevo nombre");
    expect(proyectoRepository.actualizarDatosDelColectivo).toHaveBeenCalledWith(c);
  });

  test("cambiar solo la descripcion no toca los proyectos", async () => {
    const c = colectivo();
    const { service, proyectoRepository } = armar({ colectivos: [c] });

    await service.actualizar(c.id, { descripcion: "Otra" });

    expect(proyectoRepository.actualizarDatosDelColectivo).not.toHaveBeenCalled();
  });

  test("un colectivo dado de baja no se modifica", async () => {
    const c = colectivo({ fechaBaja: new Date() });
    const { service } = armar({ colectivos: [c] });

    await expect(service.actualizar(c.id, { nombre: "x" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe("ColectivoService · baja (con dobles)", () => {
  test("cierra sus proyectos abiertos, avisa a cada persona y borra sus contactos", async () => {
    const c = colectivo({ mediosDeContacto: [{ tipo: "EMAIL", valor: "a@b.com" }] });
    const abierto = proyecto({ colectivoId: c.id });
    abierto.colaboraciones.push(
      colaboracion({
        colaborador: colaborador(),
        perfil: abierto.perfiles[0].id,
        estado: COLABORACION_ESTADO.ACEPTADA,
      }),
      colaboracion({ colaborador: colaborador(), perfil: abierto.perfiles[0].id }),
    );
    const finalizado = proyecto({
      colectivoId: c.id,
      estado: PROYECTO_ESTADO.FINALIZADO,
    });
    const { service, proyectoRepository, notificacionService } = armar({
      colectivos: [c],
      proyectos: [abierto, finalizado],
    });

    await service.darDeBaja(c.id);

    expect(c.estaDadoDeBaja()).toBe(true);
    expect(c.mediosDeContacto).toEqual([]);
    expect(abierto.estado).toBe(PROYECTO_ESTADO.FINALIZADO);
    expect(proyectoRepository.guardar).toHaveBeenCalledTimes(1);
    expect(notificacionService.notificar).toHaveBeenCalledTimes(2);
  });

  test("no se da de baja dos veces", async () => {
    const c = colectivo({ fechaBaja: new Date() });
    const { service } = armar({ colectivos: [c] });

    await expect(service.darDeBaja(c.id)).rejects.toBeInstanceOf(ConflictError);
  });
});
