import { PerfilService } from "../../../src/services/PerfilService.js";
import { ConflictError } from "../../../src/errors/ConflictError.js";
import { DomainError } from "../../../src/errors/DomainError.js";
import { NotFoundError } from "../../../src/errors/NotFoundError.js";
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

function armar(proyectos) {
  const proyectoRepository = new ProyectoRepositoryEnMemoria(proyectos);
  const service = new PerfilService({
    proyectoRepository,
    habilidadService: { resolverPorCodigos: async (codigos) => codigos.map(habilidad) },
    notificacionService: notificacionServiceEspia(),
    transacciones: sinTransacciones,
  });
  return { service, proyectoRepository };
}

describe("PerfilService · eliminar (con dobles)", () => {
  test("el proyecto conserva al menos un perfil", async () => {
    const p = proyecto();
    const { service, proyectoRepository } = armar([p]);

    await expect(service.eliminar(p.id, p.perfiles[0].id)).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(proyectoRepository.guardar).not.toHaveBeenCalled();
  });

  test("no se elimina un perfil con historial de postulaciones", async () => {
    const p = proyecto({ perfiles: [perfil(), perfil()] });
    p.colaboraciones.push(
      colaboracion({ colaborador: colaborador(), perfil: p.perfiles[0].id }),
    );
    const { service } = armar([p]);

    await expect(service.eliminar(p.id, p.perfiles[0].id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  test("elimina un perfil sin historial", async () => {
    const [queda, sale] = [perfil(), perfil()];
    const p = proyecto({ perfiles: [queda, sale] });
    const { service, proyectoRepository } = armar([p]);

    await service.eliminar(p.id, sale.id);

    expect(p.perfiles).toEqual([queda]);
    expect(proyectoRepository.guardar).toHaveBeenCalledWith(p);
  });

  test("un perfil que no existe responde 404", async () => {
    const p = proyecto();
    const { service } = armar([p]);

    await expect(service.eliminar(p.id, "f".repeat(24))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("PerfilService · habilidades (con dobles)", () => {
  test("una habilidad opcional no puede pasar a ser requerida a la vez", async () => {
    const p = proyecto({
      perfiles: [perfil({ habilidadesOpcionales: [habilidad("react")] })],
    });
    const { service } = armar([p]);

    await expect(
      service.agregarHabilidadRequerida(p.id, p.perfiles[0].id, "react"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("no se quita la ultima habilidad requerida", async () => {
    const p = proyecto();
    const { service } = armar([p]);

    await expect(
      service.quitarHabilidadRequerida(p.id, p.perfiles[0].id, "node"),
    ).rejects.toBeInstanceOf(DomainError);
  });

  test("agrega una habilidad opcional nueva", async () => {
    const p = proyecto();
    const { service } = armar([p]);

    const actualizado = await service.agregarHabilidadOpcional(
      p.id,
      p.perfiles[0].id,
      "react",
    );

    expect(actualizado.codigosOpcionales()).toEqual(["react"]);
  });
});
