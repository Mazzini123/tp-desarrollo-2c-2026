import { armarServices, crearColectivoDePrueba, datosDePerfil, CODIGOS } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

describe("ReclutamientoService · buscar colaboradoras segun un perfil", () => {
  let services;
  let proyecto;
  let perfil;

  beforeEach(async () => {
    services = await armarServices();
    const colectivo = await crearColectivoDePrueba(services.colectivoService);
    proyecto = await services.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo: "Sitio",
      descripcion: "...",
      perfiles: [
        datosDePerfil({
          requeridas: [CODIGOS.node],
          opcionales: [CODIGOS.react, CODIGOS.cypress],
        }),
      ],
    });
    perfil = proyecto.perfiles[0];
  });

  const crear = (cuentaGit, habilidades) =>
    services.colaboradorService.crear({ cuentaGit, codigosHabilidades: habilidades });

  function buscar() {
    return services.reclutamientoService.buscarColaboradoras(proyecto.id, perfil.id);
  }

  test("devuelve solo a quienes tienen todas las habilidades requeridas", async () => {
    await crear("ada", [CODIGOS.node]);
    await crear("grace", [CODIGOS.react]);

    const resultado = await buscar();
    expect(resultado.items.map((i) => i.colaborador.cuentaGit)).toEqual(["ada"]);
    expect(resultado.total).toBe(1);
  });

  test("ordena primero a quien cumple mas habilidades opcionales", async () => {
    await crear("solo-node", [CODIGOS.node]);
    await crear("completa", [CODIGOS.node, CODIGOS.react, CODIGOS.cypress]);
    await crear("con-react", [CODIGOS.node, CODIGOS.react]);

    const resultado = await buscar();
    expect(resultado.items.map((i) => i.colaborador.cuentaGit)).toEqual([
      "completa",
      "con-react",
      "solo-node",
    ]);
    expect(resultado.items[0].habilidadesOpcionalesQueTiene).toEqual([
      CODIGOS.react,
      CODIGOS.cypress,
    ]);
  });

  test("no incluye a quien ya se postulo al proyecto", async () => {
    const ada = await crear("ada", [CODIGOS.node]);
    await services.colaboracionService.registrar({ proyectoId: proyecto.id, colaboradorId: ada.id });

    expect((await buscar()).total).toBe(0);
  });

  test("un perfil que no existe tira NotFoundError", async () => {
    await expect(
      services.reclutamientoService.buscarColaboradoras(proyecto.id, "no-existe"),
    ).rejects.toThrow(NotFoundError);
  });

  test("pagina los resultados", async () => {
    for (const nombre of ["a", "b", "c"]) {
      await crear(nombre, [CODIGOS.node]);
    }
    const pagina = await services.reclutamientoService.buscarColaboradoras(proyecto.id, perfil.id, {
      numeroPagina: 2,
      limitePorPagina: 2,
    });
    expect(pagina.items).toHaveLength(1);
    expect(pagina.totalPaginas).toBe(2);
  });
});

describe("ReclutamientoService · invitar", () => {
  let services;
  let proyecto;
  let perfil;

  beforeEach(async () => {
    services = await armarServices();
    const colectivo = await crearColectivoDePrueba(services.colectivoService);
    proyecto = await services.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo: "Sitio",
      descripcion: "...",
      perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
    });
    perfil = proyecto.perfiles[0];
  });

  function invitar(colaboradorId) {
    return services.reclutamientoService.invitar(proyecto.id, perfil.id, {
      colaboradorId,
      mensaje: "Nos encantaria contar con vos",
    });
  }

  test("manda una notificacion interna y la replica por email", async () => {
    const ada = await services.colaboradorService.crear({
      cuentaGit: "ada",
      codigosHabilidades: [CODIGOS.node],
      mediosDeContacto: [{ tipo: "EMAIL", valor: "ada@mail.com" }],
    });

    const notificacion = await invitar(ada.id);

    expect(notificacion.tipo).toBe("INVITACION");
    expect(notificacion.referencias).toMatchObject({ proyectoId: proyecto.id, perfilId: perfil.id });
    expect(notificacion.contenido).toContain("Nos encantaria contar con vos");
    expect(services.canales.EMAIL.enviados).toHaveLength(1);
  });

  test("si no acepta ser contactada tira ConflictError", async () => {
    const ada = await services.colaboradorService.crear({
      cuentaGit: "ada",
      codigosHabilidades: [CODIGOS.node],
      recibeMensajeriaInterna: false,
    });
    await expect(invitar(ada.id)).rejects.toThrow(ConflictError);
  });

  test("si no cumple el perfil tira DomainError", async () => {
    const grace = await services.colaboradorService.crear({
      cuentaGit: "grace",
      codigosHabilidades: [CODIGOS.react],
    });
    await expect(invitar(grace.id)).rejects.toThrow(DomainError);
  });

  test("a un proyecto finalizado no se invita", async () => {
    const ada = await services.colaboradorService.crear({
      cuentaGit: "ada",
      codigosHabilidades: [CODIGOS.node],
    });
    await services.proyectoService.finalizar(proyecto.id);
    await expect(invitar(ada.id)).rejects.toThrow(ConflictError);
  });
});
