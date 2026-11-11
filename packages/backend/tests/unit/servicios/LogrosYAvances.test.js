import { LogroService } from "../../../src/services/LogroService.js";
import { AvanceService } from "../../../src/services/AvanceService.js";
import { ConflictError } from "../../../src/errors/ConflictError.js";
import { DomainError } from "../../../src/errors/DomainError.js";
import { NotFoundError } from "../../../src/errors/NotFoundError.js";
import { PROYECTO_ESTADO } from "../../../src/domain/enums/PROYECTO_ESTADO.js";
import { proyecto } from "../dobles/entidades.js";
import { ProyectoRepositoryEnMemoria } from "../dobles/repositorios.js";

function armar(proyectos) {
  const proyectoRepository = new ProyectoRepositoryEnMemoria(proyectos);
  return {
    proyectoRepository,
    logros: new LogroService({ proyectoRepository }),
    avances: new AvanceService({ proyectoRepository }),
  };
}

describe("LogroService (con dobles)", () => {
  test("agrega un logro y rechaza otro con el mismo titulo", async () => {
    const p = proyecto();
    const { logros, proyectoRepository } = armar([p]);

    await logros.crear(p.id, { titulo: "Primer mapa", descripcion: "d" });
    await expect(
      logros.crear(p.id, { titulo: "PRIMER MAPA", descripcion: "x" }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(p.logros).toHaveLength(1);
    expect(proyectoRepository.guardar).toHaveBeenCalledTimes(1);
  });

  test("un proyecto finalizado no suma logros", async () => {
    const p = proyecto({ estado: PROYECTO_ESTADO.FINALIZADO });
    const { logros } = armar([p]);

    await expect(
      logros.crear(p.id, { titulo: "t", descripcion: "d" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("elimina un logro existente y responde 404 si no existe", async () => {
    const p = proyecto({ logros: [{ id: "l1", titulo: "t", descripcion: "d" }] });
    const { logros } = armar([p]);

    await logros.eliminar(p.id, "l1");
    expect(p.logros).toEqual([]);
    await expect(logros.eliminar(p.id, "l1")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("AvanceService (con dobles)", () => {
  test("registra un avance que supera al porcentaje actual", async () => {
    const p = proyecto({ porcentajeConcrecion: 30 });
    const { avances, proyectoRepository } = armar([p]);

    const avance = await avances.registrar(p.id, {
      porcentajeConcrecion: 50,
      urlSistema: "https://a.org",
      urlRepositorio: "https://github.com/a/b",
    });

    expect(avance.porcentajeConcrecion).toBe(50);
    expect(proyectoRepository.guardar).toHaveBeenCalledWith(p);
  });

  test("un avance que no supera al actual es una regla de negocio", async () => {
    const p = proyecto({ porcentajeConcrecion: 30 });
    const { avances, proyectoRepository } = armar([p]);

    await expect(
      avances.registrar(p.id, { porcentajeConcrecion: 30 }),
    ).rejects.toBeInstanceOf(DomainError);
    expect(proyectoRepository.guardar).not.toHaveBeenCalled();
  });

  test("un proyecto que no existe responde 404", async () => {
    const { avances } = armar([]);

    await expect(
      avances.registrar("f".repeat(24), { porcentajeConcrecion: 10 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
