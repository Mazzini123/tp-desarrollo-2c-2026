import { armarServices, crearColectivoDePrueba, datosDePerfil, CODIGOS } from "../fixtures.js";

// Requerimiento adicional 9: notificaciones automaticas.
describe("Avisos automaticos", () => {
  let services;
  let colectivo;

  beforeEach(async () => {
    services = await armarServices();
    colectivo = await crearColectivoDePrueba(services.colectivoService);
  });

  const crearPersona = (cuentaGit, habilidades, datos = {}) =>
    services.colaboradorService.crear({ cuentaGit, codigosHabilidades: habilidades, ...datos });

  const crearProyecto = (titulo, requeridas, datos = {}) =>
    services.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo,
      descripcion: "...",
      perfiles: [datosDePerfil({ requeridas })],
      ...datos,
    });

  const tiposEnLaBandeja = async (colaborador) =>
    (await services.notificacionService.listar(colaborador.id)).items.map((n) => n.tipo);

  test("al cargar un proyecto se avisa solo a quienes cumplen algun perfil", async () => {
    const ada = await crearPersona("ada", [CODIGOS.node]);
    const grace = await crearPersona("grace", [CODIGOS.react]);

    await crearProyecto("API", [CODIGOS.node]);

    expect(await tiposEnLaBandeja(ada)).toEqual(["PROYECTOS_COMPATIBLES"]);
    expect(await tiposEnLaBandeja(grace)).toEqual([]);
  });

  test("respeta a quien no quiere recibir mensajes", async () => {
    const ada = await crearPersona("ada", [CODIGOS.node], { recibeMensajeriaInterna: false });
    await crearProyecto("API", [CODIGOS.node]);
    expect(await tiposEnLaBandeja(ada)).toEqual([]);
  });

  test("al cargar una persona se le avisa que proyectos abiertos le sirven", async () => {
    await crearProyecto("API", [CODIGOS.node]);
    await crearProyecto("Front", [CODIGOS.react]);
    const cerrado = await crearProyecto("Viejo", [CODIGOS.node]);
    await services.proyectoService.finalizar(cerrado.id);

    const ada = await crearPersona("ada", [CODIGOS.node]);

    const [aviso] = (await services.notificacionService.listar(ada.id)).items;
    expect(aviso.asunto).toMatch(/1 proyecto/);
    expect(aviso.contenido).toBe("- API");
  });

  test("si no hay nada compatible no se manda nada", async () => {
    const ada = await crearPersona("ada", [CODIGOS.cypress]);
    expect(await tiposEnLaBandeja(ada)).toEqual([]);
  });
});
