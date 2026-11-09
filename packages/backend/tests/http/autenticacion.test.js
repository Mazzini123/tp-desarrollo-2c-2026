import { armarApp } from "./app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";
import { UnauthorizedError } from "../../src/errors/UnauthorizedError.js";
import { crearVerificadorDesdeEntorno } from "../../src/auth/configuracionAuth.js";

const verificadorDePrueba = {
  async verificar(token) {
    if (!token.startsWith("cuenta-")) {
      throw new UnauthorizedError("La sesion no es valida o vencio");
    }
    return { sub: token };
  },
};

const como = (cuenta) => ({ Authorization: `Bearer cuenta-${cuenta}` });

async function armar() {
  const { api } = await armarApp({ verificadorDeToken: verificadorDePrueba });
  const crearColectivo = async (cuenta) =>
    (
      await api
        .post("/colectivos")
        .set(como(cuenta))
        .send({ nombre: `Colectivo ${cuenta}`, descripcion: "d", tipoColectivo: "ONG" })
        .expect(201)
    ).body;
  const crearPersona = async (cuenta, extra = {}) =>
    (
      await api
        .post("/colaboradores")
        .set(como(cuenta))
        .send({ cuentaGit: cuenta, codigosHabilidades: [CODIGOS.node], ...extra })
        .expect(201)
    ).body;
  const crearProyecto = async (cuenta, colectivoId) =>
    (
      await api
        .post(`/colectivos/${colectivoId}/proyectos`)
        .set(como(cuenta))
        .send({
          titulo: "P",
          descripcion: "d",
          perfiles: [datosDePerfil({ modoAceptacion: "REVISION_MANUAL" })],
        })
        .expect(201)
    ).body;
  return { api, crearColectivo, crearPersona, crearProyecto };
}

describe("HTTP · sesion y cuenta", () => {
  test("GET /auth/me pide una sesion valida y informa el rol y el perfil", async () => {
    const { api, crearPersona } = await armar();

    await api.get("/auth/me").expect(401);
    await api.get("/auth/me").set("Authorization", "Bearer basura").expect(401);

    const sinPerfil = await api.get("/auth/me").set(como("ana")).expect(200);
    expect(sinPerfil.body).toEqual({ id: "cuenta-ana", rol: null, perfilId: null });

    const persona = await crearPersona("ana");
    const conPerfil = await api.get("/auth/me").set(como("ana")).expect(200);
    expect(conPerfil.body).toEqual({
      id: "cuenta-ana",
      rol: "COLABORADORA",
      perfilId: persona.id,
    });
    expect(persona).not.toHaveProperty("cuentaId");
  });

  test("las altas asocian el perfil a la cuenta y una cuenta tiene un solo perfil", async () => {
    const { api, crearColectivo } = await armar();

    await api
      .post("/colectivos")
      .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" })
      .expect(401);
    const colectivo = await crearColectivo("fundacion");
    const yo = await api.get("/auth/me").set(como("fundacion")).expect(200);
    expect(yo.body).toMatchObject({ rol: "COLECTIVO", perfilId: colectivo.id });

    await api
      .post("/colectivos")
      .set(como("fundacion"))
      .send({ nombre: "Otro", descripcion: "d", tipoColectivo: "ONG" })
      .expect(409);
    await api
      .post("/colaboradores")
      .set(como("fundacion"))
      .send({ cuentaGit: "ada" })
      .expect(409);
  });

  test("las lecturas publicas siguen abiertas sin sesion", async () => {
    const { api, crearColectivo, crearProyecto } = await armar();
    const colectivo = await crearColectivo("fundacion");
    const proyecto = await crearProyecto("fundacion", colectivo.id);

    await api.get("/proyectos").expect(200);
    await api.get(`/proyectos/${proyecto.id}`).expect(200);
    await api.get(`/colectivos/${colectivo.id}`).expect(200);
    await api.get("/estadisticas").expect(200);
  });

  test("sin configuracion de Logto no hay verificador, salvo en produccion", () => {
    expect(crearVerificadorDesdeEntorno({})).toBeNull();
    expect(() => crearVerificadorDesdeEntorno({ NODE_ENV: "production" })).toThrow();
    expect(
      crearVerificadorDesdeEntorno({ NODE_ENV: "production", AUTH_DESACTIVADA: "true" }),
    ).toBeNull();
    expect(() => crearVerificadorDesdeEntorno({ LOGTO_ENDPOINT: "https://x.logto.app" })).toThrow();
    expect(
      crearVerificadorDesdeEntorno({
        LOGTO_ENDPOINT: "https://x.logto.app",
        LOGTO_API_RESOURCE: "https://api.codigo-a-voluntad",
      }),
    ).toHaveProperty("verificar");
  });
});

describe("HTTP · quien puede modificar el proyecto", () => {
  test("solo el colectivo dueño modifica proyecto, perfiles, logros y avances", async () => {
    const { api, crearColectivo, crearPersona, crearProyecto } = await armar();
    const dueño = await crearColectivo("duenio");
    await crearColectivo("ajeno");
    await crearPersona("ada");
    const proyecto = await crearProyecto("duenio", dueño.id);
    const ruta = `/proyectos/${proyecto.id}`;

    await api.put(ruta).send({ titulo: "Nuevo" }).expect(401);
    await api.put(ruta).set(como("ajeno")).send({ titulo: "Nuevo" }).expect(403);
    await api.put(ruta).set(como("ada")).send({ titulo: "Nuevo" }).expect(403);
    await api.put(ruta).set(como("duenio")).send({ titulo: "Nuevo" }).expect(200);

    const logro = { titulo: "Hito", descripcion: "ok" };
    await api.post(`${ruta}/logros`).set(como("ajeno")).send(logro).expect(403);
    await api.post(`${ruta}/logros`).set(como("duenio")).send(logro).expect(201);
    await api
      .post(`${ruta}/finalizacion`)
      .set(como("ajeno"))
      .expect(403);
    await api
      .post(`/colectivos/${dueño.id}/proyectos`)
      .set(como("ajeno"))
      .send({ titulo: "P", descripcion: "d", perfiles: [datosDePerfil()] })
      .expect(403);
    await api.put(`/colectivos/${dueño.id}`).set(como("ajeno")).send({ nombre: "X" }).expect(403);
    await api.post(`/colectivos/${dueño.id}/baja`).set(como("ajeno")).expect(403);
  });
});

describe("HTTP · postulaciones, bandeja y contacto", () => {
  async function conPostulacion({ esPublica = true } = {}) {
    const contexto = await armar();
    const { api, crearColectivo, crearPersona, crearProyecto } = contexto;
    const colectivo = await crearColectivo("duenio");
    await crearColectivo("ajeno");
    const ada = await crearPersona("ada", {
      mediosDeContacto: [{ tipo: "EMAIL", valor: "ada@mail.com" }],
    });
    await crearPersona("grace");
    const proyecto = await crearProyecto("duenio", colectivo.id);
    const postulacion = await api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .set(como("ada"))
      .send({ colaboradorId: ada.id, perfilId: proyecto.perfiles[0].id, esPublica })
      .expect(201);
    return {
      ...contexto,
      colectivo,
      ada,
      proyecto,
      base: `/proyectos/${proyecto.id}/colaboraciones/${postulacion.body.id}`,
    };
  }

  test("nadie se postula en nombre de otra persona", async () => {
    const { api, ada, proyecto } = await conPostulacion();
    await api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .set(como("grace"))
      .send({ colaboradorId: ada.id, perfilId: proyecto.perfiles[0].id })
      .expect(403);
    await api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .send({ colaboradorId: ada.id, perfilId: proyecto.perfiles[0].id })
      .expect(401);
  });

  test("aceptar es del dueño, retirar es de la persona y la baja es de ambos", async () => {
    const { api, base } = await conPostulacion();

    await api.post(`${base}/aceptacion`).set(como("ajeno")).expect(403);
    await api.post(`${base}/aceptacion`).set(como("ada")).expect(403);
    await api.post(`${base}/retiro`).set(como("duenio")).expect(403);
    await api.post(`${base}/retiro`).set(como("grace")).expect(403);

    await api.post(`${base}/aceptacion`).set(como("duenio")).expect(200);
    await api.post(`${base}/desvinculacion`).set(como("grace")).expect(403);
    await api.post(`${base}/desvinculacion`).set(como("ajeno")).expect(403);
    await api.post(`${base}/desvinculacion`).set(como("ada")).expect(200);
  });

  test("cada parte firma su valoracion", async () => {
    const { api, base } = await conPostulacion();
    await api.post(`${base}/aceptacion`).set(como("duenio")).expect(200);
    await api.post(`${base}/finalizacion`).set(como("ada")).expect(200);

    const valoracion = { puntaje: 5, comentario: "Genial" };
    await api
      .post(`${base}/valoraciones`)
      .set(como("ada"))
      .send({ ...valoracion, autor: "COLECTIVO" })
      .expect(403);
    await api
      .post(`${base}/valoraciones`)
      .set(como("duenio"))
      .send({ ...valoracion, autor: "COLABORADOR" })
      .expect(403);
    await api
      .post(`${base}/valoraciones`)
      .set(como("duenio"))
      .send({ ...valoracion, autor: "COLECTIVO" })
      .expect(201);
  });

  test("el contacto lo ve solo el dueño y solo de una postulacion aceptada y publica", async () => {
    const { api, ada, proyecto, base } = await conPostulacion();
    const ruta = `/proyectos/${proyecto.id}/colaboradores/${ada.id}/contacto`;

    await api.get(ruta).set(como("duenio")).expect(403);
    await api.post(`${base}/aceptacion`).set(como("duenio")).expect(200);

    await api.get(ruta).expect(401);
    await api.get(ruta).set(como("ajeno")).expect(403);
    await api.get(ruta).set(como("ada")).expect(403);
    const { body } = await api.get(ruta).set(como("duenio")).expect(200);
    expect(body).toEqual([{ tipo: "EMAIL", valor: "ada@mail.com" }]);
  });

  test("una postulacion anonima aceptada no revela el contacto", async () => {
    const { api, ada, proyecto, base } = await conPostulacion({ esPublica: false });
    await api.post(`${base}/aceptacion`).set(como("duenio")).expect(200);
    await api
      .get(`/proyectos/${proyecto.id}/colaboradores/${ada.id}/contacto`)
      .set(como("duenio"))
      .expect(403);
  });

  test("las postulaciones anonimas las ve solo su dueña", async () => {
    const { api, ada } = await conPostulacion({ esPublica: false });
    const ruta = `/colaboradores/${ada.id}/colaboraciones`;

    expect((await api.get(ruta).expect(200)).body).toEqual([]);
    expect((await api.get(ruta).set(como("grace")).expect(200)).body).toEqual([]);
    const propias = await api.get(ruta).set(como("ada")).expect(200);
    expect(propias.body).toHaveLength(1);
    expect(propias.body[0].colaboracion).toMatchObject({ esPublica: false });
  });

  test("la bandeja y los datos privados son de la propia persona", async () => {
    const { api, ada } = await conPostulacion();

    await api.get(`/colaboradores/${ada.id}/notificaciones`).expect(401);
    await api.get(`/colaboradores/${ada.id}/notificaciones`).set(como("grace")).expect(403);
    await api.get(`/colaboradores/${ada.id}/notificaciones`).set(como("ada")).expect(200);
    await api.put(`/colaboradores/${ada.id}`).set(como("grace")).send({ presentacion: "x" }).expect(403);
    await api.put(`/colaboradores/${ada.id}`).set(como("ada")).send({ presentacion: "x" }).expect(200);

    await api.get(`/colaboradores/${ada.id}/medios-de-contacto`).set(como("grace")).expect(403);
    const medios = await api
      .get(`/colaboradores/${ada.id}/medios-de-contacto`)
      .set(como("ada"))
      .expect(200);
    expect(medios.body).toEqual([{ tipo: "EMAIL", valor: "ada@mail.com" }]);
    const publico = await api.get(`/colaboradores/${ada.id}`).expect(200);
    expect(publico.body).not.toHaveProperty("mediosDeContacto");
  });

  test("el colectivo lee y edita sus medios de contacto, y nadie mas", async () => {
    const { api, colectivo } = await conPostulacion();
    const ruta = `/colectivos/${colectivo.id}/medios-de-contacto`;
    const medio = { tipo: "EMAIL", valor: "f@mail.com" };

    await api.get(ruta).set(como("ajeno")).expect(403);
    await api.post(ruta).set(como("ajeno")).send(medio).expect(403);
    await api.post(ruta).set(como("duenio")).send(medio).expect(201);
    await api.post(ruta).set(como("duenio")).send(medio).expect(409);
    expect((await api.get(ruta).set(como("duenio")).expect(200)).body).toEqual([medio]);
    await api.delete(`${ruta}/EMAIL/f@mail.com`).set(como("ajeno")).expect(403);
    await api.delete(`${ruta}/EMAIL/f@mail.com`).set(como("duenio")).expect(204);
    expect((await api.get(ruta).set(como("duenio")).expect(200)).body).toEqual([]);
  });

  test("buscar y invitar candidatas es del dueño y no expone contactos", async () => {
    const { api, ada, proyecto } = await conPostulacion();
    const nuevo = await api
      .post("/colaboradores")
      .set(como("linus"))
      .send({
        cuentaGit: "linus",
        codigosHabilidades: [CODIGOS.node],
        mediosDeContacto: [{ tipo: "EMAIL", valor: "linus@mail.com" }],
      })
      .expect(201);
    const ruta = `/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}`;

    await api.get(`${ruta}/colaboradoras-potenciales`).set(como("ajeno")).expect(403);
    const { body } = await api
      .get(`${ruta}/colaboradoras-potenciales`)
      .set(como("duenio"))
      .expect(200);
    expect(JSON.stringify(body)).not.toContain("linus@mail.com");
    expect(body.data.map((c) => c.colaborador.id)).toContain(nuevo.body.id);
    expect(body.data.map((c) => c.colaborador.id)).not.toContain(ada.id);
    await api
      .post(`${ruta}/invitaciones`)
      .set(como("ajeno"))
      .send({ colaboradorId: nuevo.body.id })
      .expect(403);
    await api
      .post(`${ruta}/invitaciones`)
      .set(como("duenio"))
      .send({ colaboradorId: nuevo.body.id })
      .expect(201);
  });
});
