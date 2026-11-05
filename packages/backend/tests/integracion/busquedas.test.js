import { CODIGOS, datosDePerfil } from "../fixtures.js";
import { armarServicesConMongo, usarBaseDeTest } from "./baseDeTest.js";

/**
 * Las busquedas las resuelve Mongo con el Aggregation Framework. La regla de
 * negocio esta escrita dos veces: en los metodos de dominio (que validan una
 * postulacion) y en el pipeline (que busca). Estos tests corren el pipeline
 * contra una base real y chequean que coincida con los metodos de dominio.
 */
usarBaseDeTest();

let s;
beforeEach(async () => {
  s = await armarServicesConMongo();
});

const crearPersona = (cuentaGit, habilidades) =>
  s.colaboradorService.crear({ cuentaGit, codigosHabilidades: habilidades });

describe("colaboradoras potenciales segun un perfil", () => {
  let proyecto;
  let perfil;

  beforeEach(async () => {
    const colectivo = await s.colectivoService.crear({
      nombre: "Fundacion",
      descripcion: "...",
      tipoColectivo: "FUNDACION",
    });
    proyecto = await s.proyectoService.crear({
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

    await crearPersona("solo-node", [CODIGOS.node]);
    await crearPersona("completa", [CODIGOS.node, CODIGOS.react, CODIGOS.cypress]);
    await crearPersona("con-react", [CODIGOS.node, CODIGOS.react]);
    await crearPersona("sin-node", [CODIGOS.react, CODIGOS.cypress]);
  });

  const buscar = (opciones) =>
    s.reclutamientoService.buscarColaboradoras(proyecto.id, perfil.id, opciones);
  const cuentas = (pagina) => pagina.items.map((i) => i.colaborador.cuentaGit);

  test("filtra por requeridas y ordena por cantidad de opcionales", async () => {
    const pagina = await buscar();

    expect(cuentas(pagina)).toEqual(["completa", "con-react", "solo-node"]);
    expect(pagina.total).toBe(3);
    expect(pagina.items[0].habilidadesOpcionalesQueTiene).toEqual([
      CODIGOS.react,
      CODIGOS.cypress,
    ]);
    // Vuelven como Colaborador: con metodos y sin medios de contacto en el JSON.
    expect(pagina.items[0].colaborador.nombreParaMostrar()).toBe("completa");
  });

  test("pagina en la base: la segunda pagina trae lo que sigue", async () => {
    const pagina = await buscar({ numeroPagina: 2, limitePorPagina: 2 });

    expect(cuentas(pagina)).toEqual(["solo-node"]);
    expect(pagina.total).toBe(3);
  });

  test("quien ya se postulo deja de ser potencial", async () => {
    const completa = (await buscar()).items[0].colaborador;
    await s.colaboracionService.registrar({
      proyectoId: proyecto.id,
      perfilId: proyecto.perfiles[0].id,
      colaboradorId: completa.id,
    });

    expect(cuentas(await buscar())).toEqual(["con-react", "solo-node"]);
  });
});

describe("proyectos potenciales segun las habilidades de una persona", () => {
  test("coincide con la regla de dominio, perfil por perfil", async () => {
    const colectivo = await s.colectivoService.crear({
      nombre: "Fundacion",
      descripcion: "...",
      tipoColectivo: "FUNDACION",
    });
    const crear = (titulo, perfiles) =>
      s.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo,
        descripcion: "...",
        perfiles: perfiles.map(({ requeridas, ...extra }) => ({
          ...datosDePerfil({ requeridas }),
          ...extra,
        })),
      });
    const nodo = [CODIGOS.node];

    await crear("A: pide node", [{ requeridas: nodo }]);
    await crear("B: pide node y react", [{ requeridas: [CODIGOS.node, CODIGOS.react] }]);
    const c = await crear("C: finalizado", [{ requeridas: nodo }]);
    const d = await crear("D: limite alcanzado en modo automatico", [
      {
        requeridas: nodo,
        modoAceptacion: "HASTA_LLENAR_VACANTES",
        limiteColaboraciones: 1,
      },
    ]);
    const e = await crear("E: ya se postulo", [{ requeridas: nodo }]);
    await crear("F: un perfil de react y otro de node", [
      { requeridas: [CODIGOS.react] },
      { requeridas: nodo },
    ]);
    await crear("G: busqueda cerrada", [{ requeridas: nodo, busquedaAbierta: false }]);
    await crear("H: busqueda vencida", [
      { requeridas: nodo, fechaCierreBusqueda: new Date("2000-01-01T00:00:00Z") },
    ]);
    const i = await crear("I: limite alcanzado en revision manual", [
      { requeridas: nodo, modoAceptacion: "REVISION_MANUAL", limiteColaboraciones: 1 },
    ]);
    await crear("J: el perfil abierto pide react, el de node esta cerrado", [
      { requeridas: [CODIGOS.react] },
      { requeridas: nodo, busquedaAbierta: false },
    ]);

    await s.proyectoService.finalizar(c.id);
    const otra = await crearPersona("otra", nodo);
    await s.colaboracionService.registrar({
      proyectoId: d.id,
      perfilId: d.perfiles[0].id,
      colaboradorId: otra.id,
    });
    const enI = await s.colaboracionService.registrar({
      proyectoId: i.id,
      perfilId: i.perfiles[0].id,
      colaboradorId: otra.id,
    });
    await s.colaboracionService.aceptar(i.id, enI.id);

    const persona = await crearPersona("persona", nodo);
    const bandeja = await s.notificacionService.listar(persona.id);
    expect(bandeja.items[0].asunto).toBe(
      "Hay 3 proyecto(s) que coinciden con tus habilidades",
    );

    await s.colaboracionService.registrar({
      proyectoId: e.id,
      perfilId: e.perfiles[0].id,
      colaboradorId: persona.id,
    });

    const pagina = await s.reclutamientoService.buscarProyectos(persona.id);
    expect(pagina.items.map((p) => p.titulo)).toEqual([
      "A: pide node",
      "F: un perfil de react y otro de node",
    ]);
    expect(pagina.total).toBe(2);

    const titulosEncontrados = new Set(pagina.items.map((p) => p.titulo));
    const todos = (await s.colectivoService.buscarPorId(colectivo.id)).proyectos;
    const ahora = new Date();
    for (const proyecto of todos) {
      const segunDominio =
        proyecto.estaAbierto() &&
        !proyecto.yaColaboraron(persona) &&
        proyecto.perfiles.some(
          (perfil) =>
            perfil.aceptaPostulaciones(ahora) &&
            !perfil.limiteAlcanzado(proyecto.cantidadAceptadas(perfil)) &&
            perfil.cumpleHabilidadesRequeridas(persona),
        );
      expect([proyecto.titulo, titulosEncontrados.has(proyecto.titulo)]).toEqual([
        proyecto.titulo,
        segunDominio,
      ]);
    }
  });

  test("pagina en la base", async () => {
    const colectivo = await s.colectivoService.crear({
      nombre: "Fundacion",
      descripcion: "...",
      tipoColectivo: "FUNDACION",
    });
    for (const titulo of ["P1", "P2", "P3"]) {
      await s.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo,
        descripcion: "...",
        perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
      });
    }
    const persona = await crearPersona("persona", [CODIGOS.node]);

    const pagina = await s.reclutamientoService.buscarProyectos(persona.id, {
      numeroPagina: 2,
      limitePorPagina: 2,
    });

    expect(pagina.items.map((p) => p.titulo)).toEqual(["P3"]);
    expect(pagina.total).toBe(3);
  });
});
