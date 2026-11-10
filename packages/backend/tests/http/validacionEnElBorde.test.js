import { armarApp } from "./app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";

// La forma de los datos (obligatorios, enums, formatos) la valida Zod antes
// de llegar al servicio: estos casos responden 400 desde la ruta.
describe("HTTP · validacion de forma en el borde", () => {
  let api;
  let colectivoId;
  let colaboradorId;

  beforeEach(async () => {
    ({ api } = await armarApp());
    colectivoId = (
      await api
        .post("/colectivos")
        .send({ nombre: "Fundacion", descripcion: "d", tipoColectivo: "FUNDACION" })
        .expect(201)
    ).body.id;
    colaboradorId = (
      await api.post("/colaboradores").send({ cuentaGit: "ada" }).expect(201)
    ).body.id;
  });

  test.each([
    ["nombre vacio", { nombre: "  ", descripcion: "ok", tipoColectivo: "FUNDACION" }],
    ["descripcion vacia", { nombre: "ok", descripcion: "", tipoColectivo: "FUNDACION" }],
    ["tipo invalido", { nombre: "ok", descripcion: "ok", tipoColectivo: "INVENTADO" }],
    [
      "tipo de ubicacion invalido",
      {
        nombre: "ok",
        descripcion: "ok",
        tipoColectivo: "FUNDACION",
        ubicacion: { tipoUbicacion: "BARRIO", nombre: "Avellaneda" },
      },
    ],
  ])("el alta de un colectivo rechaza %s", async (_caso, datos) => {
    await api.post("/colectivos").send(datos).expect(400);
  });

  test("la edicion de un colectivo rechaza un nombre vacio", async () => {
    await api.put(`/colectivos/${colectivoId}`).send({ nombre: "" }).expect(400);
  });

  test("un medio de contacto de un tipo que no existe se rechaza", async () => {
    await api
      .post(`/colaboradores/${colaboradorId}/medios-de-contacto`)
      .send({ tipo: "FAX", valor: "1" })
      .expect(400);
    await api
      .delete(`/colaboradores/${colaboradorId}/medios-de-contacto/FAX/1`)
      .expect(400);
  });

  describe("proyectos, perfiles, logros y valoraciones", () => {
    let proyectoId;

    beforeEach(async () => {
      proyectoId = (
        await api
          .post(`/colectivos/${colectivoId}/proyectos`)
          .send({ titulo: "Sitio", descripcion: "d", perfiles: [datosDePerfil()] })
          .expect(201)
      ).body.id;
    });

    test("un proyecto sin perfiles se rechaza", async () => {
      await api
        .post(`/colectivos/${colectivoId}/proyectos`)
        .send({ titulo: "Sin perfiles", descripcion: "d", perfiles: [] })
        .expect(400);
    });

    test("un compromiso de horas no entero se rechaza", async () => {
      const perfil = {
        ...datosDePerfil(),
        compromiso: { cantidadHoras: 2.5, periodo: "HS_MENSUALES" },
      };
      await api
        .post(`/colectivos/${colectivoId}/proyectos`)
        .send({ titulo: "Medio compromiso", descripcion: "d", perfiles: [perfil] })
        .expect(400);
    });

    test("un perfil sin habilidades requeridas se rechaza", async () => {
      await api
        .post(`/proyectos/${proyectoId}/perfiles`)
        .send(datosDePerfil({ requeridas: [] }))
        .expect(400);
    });

    test("un logro sin titulo o sin descripcion se rechaza", async () => {
      const logro = (
        await api
          .post(`/proyectos/${proyectoId}/logros`)
          .send({ titulo: "Hito", descripcion: "d" })
          .expect(201)
      ).body;
      const ruta = `/proyectos/${proyectoId}/logros/${logro.id}`;
      await api.put(ruta).send({ titulo: "", descripcion: "x" }).expect(400);
      await api.put(ruta).send({ titulo: "x", descripcion: "" }).expect(400);
    });

    test("un puntaje fuera de 1 a 5 se rechaza", async () => {
      const persona = (
        await api
          .post("/colaboradores")
          .send({ cuentaGit: "bea", codigosHabilidades: [CODIGOS.node] })
          .expect(201)
      ).body;
      const perfilId = (await api.get(`/proyectos/${proyectoId}`).expect(200)).body
        .perfiles[0].id;
      const colaboracion = (
        await api
          .post(`/proyectos/${proyectoId}/colaboraciones`)
          .send({ colaboradorId: persona.id, perfilId })
          .expect(201)
      ).body;
      await api
        .post(`/proyectos/${proyectoId}/colaboraciones/${colaboracion.id}/valoraciones`)
        .send({ autor: "COLECTIVO", puntaje: 6 })
        .expect(400);
    });
  });
});
