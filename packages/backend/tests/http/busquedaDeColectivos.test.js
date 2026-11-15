import { armarApp } from "./app.js";

async function cargarColectivos(api) {
  const crear = (nombre, etiquetas = []) =>
    api
      .post("/colectivos")
      .send({ nombre, descripcion: "d", tipoColectivo: "ONG", etiquetas })
      .expect(201);
  await crear("Educación Popular", ["educacion"]);
  await crear("Mujeres en Tecnología", ["educacion", "genero"]);
  await crear("Huerta Comunitaria 100% Orgánica");
  await crear("Club (C++) de Datos");
  await crear("Dada de baja");
}

const nombres = (respuesta) => respuesta.body.data.map((c) => c.nombre);

describe("HTTP · GET /colectivos?q=", () => {
  test("busca por coincidencia parcial en el nombre", async () => {
    const { api } = await armarApp();
    await cargarColectivos(api);

    const respuesta = await api.get("/colectivos?q=popul").expect(200);

    expect(nombres(respuesta)).toEqual(["Educación Popular"]);
    expect(respuesta.body.meta.total).toBe(1);
  });

  test("no distingue mayúsculas", async () => {
    const { api } = await armarApp();
    await cargarColectivos(api);

    const respuesta = await api.get("/colectivos?q=MUJERES").expect(200);

    expect(nombres(respuesta)).toEqual(["Mujeres en Tecnología"]);
  });

  test("no distingue tildes, buscando con o sin ellas", async () => {
    const { api } = await armarApp();
    await cargarColectivos(api);

    const sinTilde = await api.get("/colectivos?q=educacion").expect(200);
    const conTilde = await api.get("/colectivos?q=tecnolog%C3%ADa").expect(200);
    const sinTildeEnElTexto = await api.get("/colectivos?q=tecnologia").expect(200);

    expect(nombres(sinTilde)).toEqual(["Educación Popular"]);
    expect(nombres(conTilde)).toEqual(["Mujeres en Tecnología"]);
    expect(nombres(sinTildeEnElTexto)).toEqual(["Mujeres en Tecnología"]);
  });

  test("toma los caracteres especiales como texto", async () => {
    const { api } = await armarApp();
    await cargarColectivos(api);

    const puntoYEstrella = await api.get("/colectivos?q=.*").expect(200);
    const parentesis = await api
      .get(`/colectivos?q=${encodeURIComponent("(C++)")}`)
      .expect(200);
    const porcentaje = await api
      .get(`/colectivos?q=${encodeURIComponent("100%")}`)
      .expect(200);
    const incompleta = await api
      .get(`/colectivos?q=${encodeURIComponent("(")}`)
      .expect(200);

    expect(nombres(puntoYEstrella)).toEqual([]);
    expect(nombres(parentesis)).toEqual(["Club (C++) de Datos"]);
    expect(nombres(porcentaje)).toEqual(["Huerta Comunitaria 100% Orgánica"]);
    expect(nombres(incompleta)).toEqual(["Club (C++) de Datos"]);
  });

  test("se combina con etiqueta y con la paginación", async () => {
    const { api } = await armarApp();
    await cargarColectivos(api);

    const combinado = await api
      .get("/colectivos?q=mujeres&etiqueta=educacion")
      .expect(200);
    const otraEtiqueta = await api
      .get("/colectivos?q=mujeres&etiqueta=salud")
      .expect(200);
    const primeraPagina = await api.get("/colectivos?q=a&limit=2&page=1").expect(200);
    const segundaPagina = await api.get("/colectivos?q=a&limit=2&page=2").expect(200);

    expect(nombres(combinado)).toEqual(["Mujeres en Tecnología"]);
    expect(nombres(otraEtiqueta)).toEqual([]);
    expect(primeraPagina.body.meta.total).toBeGreaterThan(2);
    expect(nombres(primeraPagina)).toHaveLength(2);
    expect(nombres(segundaPagina).length).toBeGreaterThan(0);
  });

  test("no devuelve colectivos dados de baja", async () => {
    const { api, services } = await armarApp();
    await cargarColectivos(api);
    const baja = (await api.get("/colectivos?q=baja").expect(200)).body.data[0];
    await services.colectivoService.darDeBaja(baja.id);

    const respuesta = await api.get("/colectivos?q=baja").expect(200);

    expect(nombres(respuesta)).toEqual([]);
  });

  test("rechaza un q vacío, solo con espacios o demasiado largo", async () => {
    const { api } = await armarApp();

    await api.get("/colectivos?q=").expect(400);
    await api.get("/colectivos?q=%20%20").expect(400);
    await api.get(`/colectivos?q=${"a".repeat(81)}`).expect(400);
    await api.get(`/colectivos?q=${"a".repeat(80)}`).expect(200);
  });

  test("sin q sigue listando todos los colectivos activos", async () => {
    const { api } = await armarApp();
    await cargarColectivos(api);

    const respuesta = await api.get("/colectivos").expect(200);

    expect(respuesta.body.meta.total).toBe(5);
  });
});
