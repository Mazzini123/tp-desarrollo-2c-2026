import { armarApp } from "./app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";
import { UnauthorizedError } from "../../src/errors/UnauthorizedError.js";
import { ContextoUsuarioModel } from "../../src/security/persistencia/ContextoUsuarioModel.js";
import { conReferencias } from "../soporte/contextos.js";

const autenticadorDePrueba = {
  async autenticar(token) {
    if (!token.startsWith("cuenta-")) {
      throw new UnauthorizedError("La sesion no es valida o vencio", "TOKEN_INVALIDO");
    }
    return { proveedor: "prueba", sub: token };
  },
};

const ID_INEXISTENTE = "0".repeat(24);

const codigo = (respuesta) => respuesta.body.codigo;
const tiposDe = (cuenta) => cuenta.contextos.map((c) => c.tipo).sort();

async function armar() {
  const { api } = await armarApp({ autenticador: autenticadorDePrueba });
  const token = (cuenta) => ({ Authorization: `Bearer cuenta-${cuenta}` });
  const como = (cuenta, contextoId) => ({
    ...token(cuenta),
    "X-Context-Id": contextoId,
  });

  const nombrar = async (cuenta) => {
    await api.post("/auth/registro").set(token(cuenta));
    await api
      .put("/auth/usuario")
      .set(token(cuenta))
      .send({ nombre: cuenta })
      .expect(200);
  };
  const yo = async (cuenta) =>
    (await api.get("/auth/me").set(token(cuenta)).expect(200)).body;
  const elegir = async (cuenta, contextoId) => {
    await api
      .put("/auth/contexto-actual")
      .set(token(cuenta))
      .send({ contextoId })
      .expect(200);
  };

  const crearColectivo = async (cuenta) => {
    await nombrar(cuenta);
    const { body } = await api
      .post("/colectivos")
      .set(token(cuenta))
      .send({
        nombre: `Colectivo de ${cuenta}`,
        descripcion: "d",
        tipoColectivo: "ONG",
      })
      .expect(201);
    return { colectivo: body, contextoId: (await yo(cuenta)).contextoActual.id };
  };

  const altaDePerfil = (cuenta, cuentaGit = cuenta) =>
    api
      .post("/colaboradores")
      .set(token(cuenta))
      .send({ cuentaGit, codigosHabilidades: [CODIGOS.node] });

  const crearPerfil = async (cuenta) => {
    await nombrar(cuenta);
    const { body } = await altaDePerfil(cuenta).expect(201);
    return { perfil: body, contextoId: (await yo(cuenta)).contextoActual.id };
  };

  const unirse = async (lider, cuenta, colectivoId) => {
    await nombrar(cuenta);
    const { body: solicitud } = await api
      .post(`/colectivos/${colectivoId}/solicitudes-ingreso`)
      .set(token(cuenta))
      .expect(201);
    const { body } = await api
      .post(`/colectivos/${colectivoId}/solicitudes-ingreso/${solicitud.id}/aceptacion`)
      .set(como(lider.cuenta, lider.contextoId))
      .expect(200);
    return body.miembro.contextoId;
  };

  const crearProyecto = async (lider, colectivoId) =>
    (
      await api
        .post(`/colectivos/${colectivoId}/proyectos`)
        .set(como(lider.cuenta, lider.contextoId))
        .send({
          titulo: "Huerta",
          descripcion: "d",
          perfiles: [datosDePerfil({ modoAceptacion: "REVISION_MANUAL" })],
        })
        .expect(201)
    ).body;

  const postular = (cuenta, contextoId, proyecto, colaboradorId) =>
    api
      .post(`/proyectos/${proyecto.id}/colaboraciones`)
      .set(como(cuenta, contextoId))
      .send({ colaboradorId, perfilId: proyecto.perfiles[0].id });

  const invitar = (lider, proyecto, colaboradorId) =>
    api
      .post(`/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}/invitaciones`)
      .set(como(lider.cuenta, lider.contextoId))
      .send({ colaboradorId });

  const notificaciones = (cuenta, contextoId, perfilId) =>
    api.get(`/colaboradores/${perfilId}/notificaciones`).set(como(cuenta, contextoId));

  const recibidas = (cuenta, contextoId, colectivoId) =>
    api.get(`/colectivos/${colectivoId}/postulaciones`).set(como(cuenta, contextoId));

  return {
    api,
    token,
    como,
    yo,
    elegir,
    crearColectivo,
    crearPerfil,
    altaDePerfil,
    unirse,
    crearProyecto,
    postular,
    invitar,
    notificaciones,
    recibidas,
  };
}

describe("HTTP · contextos simultaneos de una misma cuenta", () => {
  test("una cuenta con colectivo crea su perfil de colaboradora y conserva el colectivo", async () => {
    const { yo, crearColectivo, crearPerfil } = await armar();
    const colectivo = await crearColectivo("ana");

    const { perfil, contextoId } = await crearPerfil("ana");

    const cuenta = await yo("ana");
    expect(cuenta.contextoActual).toMatchObject({
      id: contextoId,
      tipo: "COLABORADOR",
      colaborador: { id: perfil.id },
    });
    expect(tiposDe(cuenta)).toEqual(["COLABORADOR", "COLECTIVO"]);
    expect(cuenta.contextos.find((c) => c.tipo === "COLECTIVO")).toMatchObject({
      id: colectivo.contextoId,
      rol: "LIDER",
      colectivo: { id: colectivo.colectivo.id },
    });
    expect(
      await ContextoUsuarioModel.countDocuments({
        usuarioId: cuenta.usuario.id,
        activo: true,
      }),
    ).toBe(2);
  });

  test("una cuenta con perfil de colaboradora crea un colectivo y sigue con su perfil", async () => {
    const { api, yo, como, crearColectivo, crearPerfil } = await armar();
    const { perfil } = await crearPerfil("ada");

    const { colectivo, contextoId } = await crearColectivo("ada");

    const cuenta = await yo("ada");
    expect(cuenta.contextoActual).toMatchObject({
      id: contextoId,
      tipo: "COLECTIVO",
      rol: "LIDER",
    });
    expect(tiposDe(cuenta)).toEqual(["COLABORADOR", "COLECTIVO"]);
    expect(cuenta.contextos.find((c) => c.tipo === "COLABORADOR")).toMatchObject({
      colaborador: { id: perfil.id },
    });
    const miembros = await api
      .get(`/colectivos/${colectivo.id}/miembros`)
      .set(como("ada", contextoId))
      .expect(200);
    expect(miembros.body).toEqual([expect.objectContaining({ rol: "LIDER" })]);
  });

  test("un segundo perfil de colaboradora sigue dando 409, tambien si se piden dos a la vez", async () => {
    const { yo, crearColectivo, crearPerfil, altaDePerfil } = await armar();
    await crearPerfil("ada");

    expect(codigo(await altaDePerfil("ada", "otra").expect(409))).toBe(
      "PERFIL_COLABORADOR_EXISTENTE",
    );

    await crearColectivo("eva");
    const altas = await Promise.all([
      altaDePerfil("eva", "eva1"),
      altaDePerfil("eva", "eva2"),
    ]);
    expect(altas.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(codigo(altas.find(({ status }) => status === 409))).toBe(
      "PERFIL_COLABORADOR_EXISTENTE",
    );
    const cuenta = await yo("eva");
    expect(
      await ContextoUsuarioModel.countDocuments(
        await conReferencias({
          usuarioId: cuenta.usuario.id,
          tipo: "COLABORADOR",
          activo: true,
        }),
      ),
    ).toBe(1);
  });

  test("la cuenta puede tener solo colectivos o solo perfil, sin exigirle el otro tipo", async () => {
    const { api, yo, como, crearColectivo, crearPerfil, unirse } = await armar();
    const b = await crearColectivo("bea");
    const a = await crearColectivo("ana");
    await unirse({ cuenta: "bea", contextoId: b.contextoId }, "ana", b.colectivo.id);

    const ana = await yo("ana");
    expect(tiposDe(ana)).toEqual(["COLECTIVO", "COLECTIVO"]);
    expect(ana.contextos.map((c) => c.colectivo.id).sort()).toEqual(
      [a.colectivo.id, b.colectivo.id].sort(),
    );

    const { perfil, contextoId } = await crearPerfil("eva");
    const eva = await yo("eva");
    expect(tiposDe(eva)).toEqual(["COLABORADOR"]);
    await api
      .get(`/colaboradores/${perfil.id}/notificaciones`)
      .set(como("eva", contextoId))
      .expect(200);
  });

  test("pedir ingreso a un colectivo y ser aceptada suma un contexto MIEMBRO sin cambiar el actual", async () => {
    const { api, yo, como, crearColectivo, crearPerfil, unirse } = await armar();
    const { contextoId: contextoPerfil } = await crearPerfil("ada");
    const b = await crearColectivo("bea");

    const contextoMiembro = await unirse(
      { cuenta: "bea", contextoId: b.contextoId },
      "ada",
      b.colectivo.id,
    );

    const cuenta = await yo("ada");
    expect(cuenta.contextoActual.id).toBe(contextoPerfil);
    expect(tiposDe(cuenta)).toEqual(["COLABORADOR", "COLECTIVO"]);
    expect(cuenta.contextos.find((c) => c.id === contextoMiembro)).toMatchObject({
      rol: "MIEMBRO",
      colectivo: { id: b.colectivo.id },
    });
    expect(
      (
        await api
          .get(`/colectivos/${b.colectivo.id}/miembros`)
          .set(como("bea", b.contextoId))
          .expect(200)
      ).body,
    ).toHaveLength(2);
  });

  test("el cambio con PUT /auth/contexto-actual define en que contexto se opera", async () => {
    const { yo, elegir, crearColectivo, crearPerfil, notificaciones, recibidas } =
      await armar();
    const a = await crearColectivo("ana");
    const p = await crearPerfil("ana");

    await elegir("ana", a.contextoId);
    await recibidas("ana", a.contextoId, a.colectivo.id).expect(200);
    expect(codigo(await recibidas("ana", p.contextoId, a.colectivo.id).expect(409))).toBe(
      "CONTEXTO_NO_ACTUAL",
    );
    expect((await yo("ana")).contextoActual.id).toBe(a.contextoId);

    await elegir("ana", p.contextoId);
    await notificaciones("ana", p.contextoId, p.perfil.id).expect(200);
    expect(
      codigo(await notificaciones("ana", a.contextoId, p.perfil.id).expect(409)),
    ).toBe("CONTEXTO_NO_ACTUAL");
  });

  test.each(["LIDER", "MIEMBRO"])(
    "una cuenta que es %s activa del colectivo no puede postular su perfil a un proyecto de ese colectivo",
    async (rol) => {
      const { api, crearColectivo, crearPerfil, crearProyecto, postular, unirse } =
        await armar();
      const c = await crearColectivo("celia");
      const lider = { cuenta: "celia", contextoId: c.contextoId };
      const proyecto = await crearProyecto(lider, c.colectivo.id);
      const cuenta = rol === "LIDER" ? "celia" : "caro";
      const p = await crearPerfil(cuenta);
      if (rol === "MIEMBRO") await unirse(lider, cuenta, c.colectivo.id);

      const respuesta = await postular(
        cuenta,
        p.contextoId,
        proyecto,
        p.perfil.id,
      ).expect(422);

      expect(codigo(respuesta)).toBe("POSTULACION_EN_COLECTIVO_PROPIO");
      expect(
        (await api.get(`/colaboradores/${p.perfil.id}/colaboraciones`).expect(200)).body,
      ).toEqual([]);
    },
  );

  test("quien salio del colectivo o nunca participo si puede postular su perfil", async () => {
    const {
      api,
      elegir,
      como,
      crearColectivo,
      crearPerfil,
      crearProyecto,
      postular,
      unirse,
    } = await armar();
    const c = await crearColectivo("celia");
    const lider = { cuenta: "celia", contextoId: c.contextoId };
    const proyecto = await crearProyecto(lider, c.colectivo.id);
    const caro = await crearPerfil("caro");
    const contextoMiembro = await unirse(lider, "caro", c.colectivo.id);
    await elegir("caro", contextoMiembro);
    await api
      .post(`/colectivos/${c.colectivo.id}/abandono`)
      .set(como("caro", contextoMiembro))
      .expect(204);
    await elegir("caro", caro.contextoId);
    const dani = await crearPerfil("dani");

    await postular("caro", caro.contextoId, proyecto, caro.perfil.id).expect(201);
    await postular("dani", dani.contextoId, proyecto, dani.perfil.id).expect(201);
  });

  test("la postulacion a otro colectivo queda en las colaboraciones del perfil y no en las recibidas del propio", async () => {
    const {
      api,
      elegir,
      como,
      crearColectivo,
      crearPerfil,
      crearProyecto,
      postular,
      recibidas,
    } = await armar();
    const a = await crearColectivo("ana");
    const p = await crearPerfil("ana");
    const b = await crearColectivo("bea");
    const proyectoDeB = await crearProyecto(
      { cuenta: "bea", contextoId: b.contextoId },
      b.colectivo.id,
    );

    await postular("ana", p.contextoId, proyectoDeB, p.perfil.id).expect(201);

    expect(
      (
        await api
          .get(`/colaboradores/${p.perfil.id}/colaboraciones`)
          .set(como("ana", p.contextoId))
          .expect(200)
      ).body,
    ).toHaveLength(1);
    await elegir("ana", a.contextoId);
    expect(
      (await recibidas("ana", a.contextoId, a.colectivo.id).expect(200)).body.data,
    ).toEqual([]);
    expect(
      (await recibidas("bea", b.contextoId, b.colectivo.id).expect(200)).body.data,
    ).toHaveLength(1);
  });

  test("cada contexto solo puede las operaciones de su tipo", async () => {
    const {
      api,
      elegir,
      como,
      crearColectivo,
      crearPerfil,
      crearProyecto,
      postular,
      invitar,
      notificaciones,
      recibidas,
    } = await armar();
    const a = await crearColectivo("ana");
    const p = await crearPerfil("ana");
    const b = await crearColectivo("bea");
    const proyectoDeB = await crearProyecto(
      { cuenta: "bea", contextoId: b.contextoId },
      b.colectivo.id,
    );
    await elegir("ana", a.contextoId);
    const lider = { cuenta: "ana", contextoId: a.contextoId };
    const proyectoDeA = await crearProyecto(lider, a.colectivo.id);
    const dani = await crearPerfil("dani");
    const { body: postulacion } = await postular(
      "dani",
      dani.contextoId,
      proyectoDeA,
      dani.perfil.id,
    ).expect(201);
    const sobre = `/proyectos/${proyectoDeA.id}/colaboraciones/${postulacion.id}`;

    await postular("ana", a.contextoId, proyectoDeB, p.perfil.id).expect(403);
    await notificaciones("ana", a.contextoId, p.perfil.id).expect(403);
    await api
      .post(`/colaboradores/${p.perfil.id}/notificaciones/${ID_INEXISTENTE}/lectura`)
      .set(como("ana", a.contextoId))
      .expect(403);
    await api
      .get(`/colaboradores/${p.perfil.id}/proyectos-potenciales`)
      .set(como("ana", a.contextoId))
      .expect(403);

    await elegir("ana", p.contextoId);
    await invitar(
      { cuenta: "ana", contextoId: p.contextoId },
      proyectoDeA,
      dani.perfil.id,
    ).expect(403);
    await api.post(`${sobre}/aceptacion`).set(como("ana", p.contextoId)).expect(403);
    await api.post(`${sobre}/rechazo`).set(como("ana", p.contextoId)).expect(403);
    await recibidas("ana", p.contextoId, a.colectivo.id).expect(403);
  });

  test("la invitacion y los avisos de resolucion se ven solo en las notificaciones del perfil", async () => {
    const {
      api,
      elegir,
      como,
      crearColectivo,
      crearPerfil,
      crearProyecto,
      postular,
      invitar,
      notificaciones,
      recibidas,
    } = await armar();
    const a = await crearColectivo("ana");
    const p = await crearPerfil("ana");
    const b = await crearColectivo("bea");
    const lideraB = { cuenta: "bea", contextoId: b.contextoId };
    const proyecto = await crearProyecto(lideraB, b.colectivo.id);
    const otroProyecto = await crearProyecto(lideraB, b.colectivo.id);

    const { body: postulacion } = await postular(
      "ana",
      p.contextoId,
      proyecto,
      p.perfil.id,
    ).expect(201);
    await api
      .post(`/proyectos/${proyecto.id}/colaboraciones/${postulacion.id}/aceptacion`)
      .set(como("bea", b.contextoId))
      .expect(200);
    await invitar(lideraB, otroProyecto, p.perfil.id).expect(201);

    const bandeja = await notificaciones("ana", p.contextoId, p.perfil.id).expect(200);
    expect(bandeja.body.data.map((n) => n.tipo)).toEqual(
      expect.arrayContaining(["INVITACION", "POSTULACION_ACEPTADA"]),
    );

    await elegir("ana", a.contextoId);
    await notificaciones("ana", a.contextoId, p.perfil.id).expect(403);
    expect(
      (await recibidas("ana", a.contextoId, a.colectivo.id).expect(200)).body.data,
    ).toEqual([]);
  });

  test("lo que llega al perfil mientras la cuenta opera como colectivo se guarda y aparece al volver", async () => {
    const {
      elegir,
      crearColectivo,
      crearPerfil,
      crearProyecto,
      invitar,
      notificaciones,
    } = await armar();
    const a = await crearColectivo("ana");
    const p = await crearPerfil("ana");
    const b = await crearColectivo("bea");
    const lideraB = { cuenta: "bea", contextoId: b.contextoId };
    const proyecto = await crearProyecto(lideraB, b.colectivo.id);
    await elegir("ana", a.contextoId);

    await invitar(lideraB, proyecto, p.perfil.id).expect(201);

    await notificaciones("ana", a.contextoId, p.perfil.id).expect(403);
    await elegir("ana", p.contextoId);
    const bandeja = await notificaciones("ana", p.contextoId, p.perfil.id).expect(200);
    expect(bandeja.body.data.map((n) => n.tipo)).toContain("INVITACION");
    expect(bandeja.body.meta.unread).toBeGreaterThanOrEqual(1);
  });

  test("dar de baja el perfil no arrastra los contextos de colectivo ni de membresia", async () => {
    const { api, yo, elegir, como, crearColectivo, crearPerfil, unirse } = await armar();
    const a = await crearColectivo("ana");
    const p = await crearPerfil("ana");
    const b = await crearColectivo("bea");
    const contextoMiembro = await unirse(
      { cuenta: "bea", contextoId: b.contextoId },
      "ana",
      b.colectivo.id,
    );

    await api
      .post(`/colaboradores/${p.perfil.id}/baja`)
      .set(como("ana", p.contextoId))
      .expect(200);

    const cuenta = await yo("ana");
    expect(cuenta.contextoActual).toBeNull();
    expect(tiposDe(cuenta)).toEqual(["COLECTIVO", "COLECTIVO"]);
    expect(cuenta.contextos.map((c) => c.id).sort()).toEqual(
      [a.contextoId, contextoMiembro].sort(),
    );
    await elegir("ana", a.contextoId);
    await elegir("ana", contextoMiembro);
  });

  test("dar de baja un colectivo desactiva solo sus contextos y deja perfiles y otros colectivos", async () => {
    const { api, yo, elegir, como, crearColectivo, crearPerfil, unirse } = await armar();
    const a = await crearColectivo("ana");
    await crearPerfil("ana");
    const d = await crearColectivo("caro");
    await crearPerfil("caro");
    await elegir("ana", a.contextoId);
    await unirse({ cuenta: "ana", contextoId: a.contextoId }, "caro", a.colectivo.id);

    await api
      .post(`/colectivos/${a.colectivo.id}/baja`)
      .set(como("ana", a.contextoId))
      .expect(200);

    expect(
      await ContextoUsuarioModel.countDocuments({
        colectivoId: a.colectivo.id,
        activo: true,
      }),
    ).toBe(0);
    expect(
      await ContextoUsuarioModel.countDocuments({ colectivoId: a.colectivo.id }),
    ).toBe(2);
    const ana = await yo("ana");
    expect(tiposDe(ana)).toEqual(["COLABORADOR"]);
    const caro = await yo("caro");
    expect(tiposDe(caro)).toEqual(["COLABORADOR", "COLECTIVO"]);
    expect(caro.contextos.find((c) => c.tipo === "COLECTIVO")).toMatchObject({
      id: d.contextoId,
      colectivo: { id: d.colectivo.id },
    });
  });

  test("al volver a ingresar se conserva el contexto actual guardado", async () => {
    const { api, token, yo, elegir, crearColectivo, crearPerfil } = await armar();
    const a = await crearColectivo("ana");
    await crearPerfil("ana");
    await elegir("ana", a.contextoId);

    const reingreso = await api.post("/auth/registro").set(token("ana")).expect(200);

    expect(reingreso.body.creado).toBe(false);
    const cuenta = await yo("ana");
    expect(cuenta.contextoActual.id).toBe(a.contextoId);
    expect(tiposDe(cuenta)).toEqual(["COLABORADOR", "COLECTIVO"]);
  });

  describe("colaboracion propia desde un colectivo", () => {
    async function conPostulacionPropia() {
      const base = await armar();
      const c = await base.crearColectivo("celia");
      const lider = { cuenta: "celia", contextoId: c.contextoId };
      const proyecto = await base.crearProyecto(lider, c.colectivo.id);
      const caro = await base.crearPerfil("caro");
      const postulacion = (
        await base.postular("caro", caro.contextoId, proyecto, caro.perfil.id).expect(201)
      ).body;
      const contextoMiembro = await base.unirse(lider, "caro", c.colectivo.id);
      const ruta = `/proyectos/${proyecto.id}/colaboraciones/${postulacion.id}`;
      const comoMiembro = (accion, cuerpo) =>
        base.api
          .post(`${ruta}/${accion}`)
          .set(base.como("caro", contextoMiembro))
          .send(cuerpo);
      const comoColaboradora = (accion, cuerpo) =>
        base.api
          .post(`${ruta}/${accion}`)
          .set(base.como("caro", caro.contextoId))
          .send(cuerpo);
      const comoLider = (accion, cuerpo) =>
        base.api
          .post(`${ruta}/${accion}`)
          .set(base.como(lider.cuenta, lider.contextoId))
          .send(cuerpo);
      await base.elegir("caro", contextoMiembro);
      return { ...base, caro, comoMiembro, comoColaboradora, comoLider };
    }

    test.each(["aceptacion", "rechazo"])(
      "quien se sumo al colectivo no puede resolver su propia postulacion (%s)",
      async (accion) => {
        const { comoMiembro } = await conPostulacionPropia();

        const respuesta = await comoMiembro(accion).expect(422);

        expect(codigo(respuesta)).toBe("COLABORACION_PROPIA");
      },
    );

    test("el liderazgo si puede resolver la postulacion y el miembro no puede finalizar, desvincular ni valorar como colectivo", async () => {
      const { comoMiembro, comoLider } = await conPostulacionPropia();

      await comoLider("aceptacion").expect(200);

      for (const accion of ["finalizacion", "desvinculacion"]) {
        expect(codigo(await comoMiembro(accion).expect(422))).toBe("COLABORACION_PROPIA");
      }
      const valoracion = await comoMiembro("valoraciones", {
        autor: "COLECTIVO",
        puntaje: 5,
      }).expect(422);
      expect(codigo(valoracion)).toBe("COLABORACION_PROPIA");
    });

    test("como colaboradora sigue pudiendo finalizar y valorar su propia colaboracion", async () => {
      const { caro, comoColaboradora, comoLider, elegir } = await conPostulacionPropia();
      await comoLider("aceptacion").expect(200);
      await elegir("caro", caro.contextoId);

      await comoColaboradora("finalizacion").expect(200);
      await comoColaboradora("valoraciones", { autor: "COLABORADOR", puntaje: 4 }).expect(
        201,
      );
    });
  });
});
