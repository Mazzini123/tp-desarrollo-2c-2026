import { armarServices, crearProyectoDePrueba, datosDePerfil, CODIGOS } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("PerfilService · alta", () => {
  let services;
  let proyecto;

  beforeEach(async () => {
    services = await armarServices();
    proyecto = (await crearProyectoDePrueba(services)).proyecto;
  });

  test("agrega el perfil al proyecto", async () => {
    await services.perfilService.crear(proyecto.id, datosDePerfil({ requeridas: [CODIGOS.react] }));
    expect(await services.perfilService.listar(proyecto.id)).toHaveLength(2);
  });

  test("un perfil sin habilidades requeridas es rechazado", async () => {
    await expect(
      services.perfilService.crear(proyecto.id, datosDePerfil({ requeridas: [] })),
    ).rejects.toThrow(DomainError);
  });

  test("una habilidad no puede ser requerida y opcional a la vez", async () => {
    await expect(
      services.perfilService.crear(
        proyecto.id,
        datosDePerfil({ requeridas: [CODIGOS.node], opcionales: [CODIGOS.node] }),
      ),
    ).rejects.toThrow(DomainError);
  });

  test("una habilidad inexistente tira NotFoundError", async () => {
    await expect(
      services.perfilService.crear(proyecto.id, datosDePerfil({ requeridas: ["inventada"] })),
    ).rejects.toThrow(NotFoundError);
  });

  test("un proyecto que no existe tira NotFoundError", async () => {
    await expect(services.perfilService.crear("no-existe", datosDePerfil())).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("PerfilService · baja", () => {
  test("no se puede eliminar el ultimo perfil del proyecto", async () => {
    const services = await armarServices();
    const { proyecto } = await crearProyectoDePrueba(services);
    const [perfil] = proyecto.perfiles;

    await expect(services.perfilService.eliminar(proyecto.id, perfil.id)).rejects.toThrow(
      DomainError,
    );
  });

  test("se puede eliminar uno si quedan dos", async () => {
    const services = await armarServices();
    const { proyecto } = await crearProyectoDePrueba(services);
    const segundo = await services.perfilService.crear(proyecto.id, datosDePerfil());

    await services.perfilService.eliminar(proyecto.id, segundo.id);
    expect(await services.perfilService.listar(proyecto.id)).toHaveLength(1);
  });
});

describe("PerfilService · habilidades", () => {
  let services;
  let proyecto;
  let perfil;

  beforeEach(async () => {
    services = await armarServices();
    proyecto = (await crearProyectoDePrueba(services, { habilidades: [CODIGOS.node] })).proyecto;
    [perfil] = proyecto.perfiles;
  });

  test("no se puede quitar la ultima habilidad requerida", async () => {
    await expect(
      services.perfilService.quitarHabilidadRequerida(proyecto.id, perfil.id, CODIGOS.node),
    ).rejects.toThrow(DomainError);
  });

  test("se puede quitar una requerida si quedan dos", async () => {
    await services.perfilService.agregarHabilidadRequerida(proyecto.id, perfil.id, CODIGOS.react);
    const final = await services.perfilService.quitarHabilidadRequerida(
      proyecto.id,
      perfil.id,
      CODIGOS.node,
    );
    expect(final.habilidadesRequeridas.map((h) => h.codigo)).toEqual([CODIGOS.react]);
  });

  test("agregar como opcional una que ya es requerida tira ConflictError", async () => {
    await expect(
      services.perfilService.agregarHabilidadOpcional(proyecto.id, perfil.id, CODIGOS.node),
    ).rejects.toThrow(ConflictError);
  });

  test("agregar y quitar una opcional", async () => {
    await services.perfilService.agregarHabilidadOpcional(proyecto.id, perfil.id, CODIGOS.react);
    const final = await services.perfilService.quitarHabilidadOpcional(
      proyecto.id,
      perfil.id,
      CODIGOS.react,
    );
    expect(final.habilidadesOpcionales).toEqual([]);
  });

  test.each([
    ["agregar una requerida", (s, p, f) => s.perfilService.agregarHabilidadRequerida(p, f, CODIGOS.react)],
    ["quitar una requerida", (s, p, f) => s.perfilService.quitarHabilidadRequerida(p, f, CODIGOS.node)],
    ["modificar el perfil", (s, p, f) => s.perfilService.actualizar(p, f, { descripcion: "Otra" })],
  ])("con el proyecto finalizado no se puede %s", async (_caso, operacion) => {
    await services.proyectoService.finalizar(proyecto.id);
    await expect(operacion(services, proyecto.id, perfil.id)).rejects.toThrow(ConflictError);
  });
});
