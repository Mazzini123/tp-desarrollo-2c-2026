import { armarApp } from "./app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";

async function crearColectivo(api, datos) {
  const { body } = await api
    .post("/colectivos")
    .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG", ...datos })
    .expect(201);
  return body.id;
}

async function crearProyecto(api, colectivoId, perfil = {}, extra = {}) {
  const { body } = await api
    .post(`/colectivos/${colectivoId}/proyectos`)
    .send({
      titulo: "P",
      descripcion: "d",
      perfiles: [{ ...datosDePerfil(), ...perfil }],
      ...extra,
    })
    .expect(201);
  return body;
}

describe("HTTP · filtros de proyectos", () => {
  test("filtra por estado, tipo de colectivo, ubicacion, modalidad y habilidad", async () => {
    const { api } = await armarApp();
    const ong = await crearColectivo(api, {
      ubicacion: { tipoUbicacion: "PROVINCIA", nombre: "Cordoba" },
    });
    const fundacion = await crearColectivo(api, { tipoColectivo: "FUNDACION" });
    const abierto = await crearProyecto(api, ong, {
      modalidadColaboracion: "OFRECE_INCENTIVO_ECONOMICO",
    });
    const otro = await crearProyecto(api, fundacion, {
      requeridas: undefined,
      codigosHabilidadesRequeridas: [CODIGOS.react],
    });
    await api.post(`/proyectos/${otro.id}/finalizacion`).expect(200);

    const ids = async (query) =>
      (await api.get(`/proyectos?${query}`).expect(200)).body.data.map((p) => p.id);

    expect(await ids("")).toHaveLength(2);
    expect(await ids("estado=ABIERTO")).toEqual([abierto.id]);
    expect(await ids("estado=FINALIZADO")).toEqual([otro.id]);
    expect(await ids("tipoColectivo=FUNDACION")).toEqual([otro.id]);
    expect(await ids("ubicacion=Cordoba")).toEqual([abierto.id]);
    expect(await ids("modalidad=OFRECE_INCENTIVO_ECONOMICO")).toEqual([abierto.id]);
    expect(await ids(`habilidad=${CODIGOS.react}`)).toEqual([otro.id]);
    expect(await ids(`estado=ABIERTO&habilidad=${CODIGOS.react}`)).toEqual([]);
    await api.get("/proyectos?estado=INVENTADO").expect(400);
  });
});

describe("HTTP · bandeja de mensajes", () => {
  test("filtra por leida y informa el total de no leidas en meta.unread", async () => {
    const { api } = await armarApp();
    const colectivo = await crearColectivo(api, {});
    const proyecto = await crearProyecto(api, colectivo);
    const persona = await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] })
      .expect(201);
    const ruta = `/colaboradores/${persona.body.id}/notificaciones`;
    await api
      .post(`/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}/invitaciones`)
      .send({ colaboradorId: persona.body.id })
      .expect(201);

    const todas = (await api.get(ruta).expect(200)).body;
    const total = todas.meta.total;
    expect(todas.meta.unread).toBe(total);

    await api.post(`${ruta}/${todas.data[0].id}/lectura`).expect(200);
    const noLeidas = (await api.get(`${ruta}?leida=false`).expect(200)).body;
    const leidas = (await api.get(`${ruta}?leida=true`).expect(200)).body;
    expect(noLeidas.meta.total).toBe(total - 1);
    expect(leidas.data.map((n) => n.id)).toEqual([todas.data[0].id]);
    expect(leidas.meta.unread).toBe(total - 1);
    await api.get(`${ruta}?leida=quizas`).expect(400);
  });
});

describe("HTTP · provincias, largos y fechas", () => {
  test("el catalogo lista las provincias y la ubicacion acepta tildes", async () => {
    const { api } = await armarApp();
    const provincias = (await api.get("/catalogos/provincias").expect(200)).body;
    expect(provincias).toContain("Cordoba");
    expect(provincias).toHaveLength(23);

    const { body } = await api
      .post("/colectivos")
      .send({
        nombre: "F",
        descripcion: "d",
        tipoColectivo: "ONG",
        ubicacion: { tipoUbicacion: "PROVINCIA", nombre: "Córdoba" },
      })
      .expect(201);
    expect(body.ubicacion.nombre).toBe("Cordoba");
  });

  test("valida largos maximos y el formato de cuentaGit", async () => {
    const { api } = await armarApp();
    await api
      .post("/colectivos")
      .send({ nombre: "n".repeat(101), descripcion: "d", tipoColectivo: "ONG" })
      .expect(400);
    await api
      .post("/colaboradores")
      .send({ cuentaGit: "https://github.com/ada", codigosHabilidades: [] })
      .expect(400);
    await api
      .post("/colaboradores")
      .send({ cuentaGit: "ada-dev", pronombres: ["p".repeat(21)] })
      .expect(400);
    await api.post("/colaboradores").send({ cuentaGit: "ada-dev" }).expect(201);
  });

  test("una fecha de cierre sin hora vale hasta el fin del dia en Argentina", async () => {
    const { api } = await armarApp();
    const colectivo = await crearColectivo(api, {});
    const manana = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10);
    const proyecto = await crearProyecto(api, colectivo, {}, { fechaCierre: manana });
    expect(proyecto.fechaCierre).toBe(
      `${manana}T23:59:59.999-03:00`.replace(/.*/, (t) => new Date(t).toISOString()),
    );
  });
});
