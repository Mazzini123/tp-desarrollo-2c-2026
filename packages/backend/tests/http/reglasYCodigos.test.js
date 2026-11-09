import { armarApp } from "./app.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";

async function prepararProyecto(cantidadDePerfiles = 1) {
  const { api } = await armarApp();
  const colectivo = await api
    .post("/colectivos")
    .send({ nombre: "F", descripcion: "d", tipoColectivo: "ONG" })
    .expect(201);
  const perfiles = Array.from({ length: cantidadDePerfiles }, () =>
    datosDePerfil({ modoAceptacion: "REVISION_MANUAL" }),
  );
  const proyecto = await api
    .post(`/colectivos/${colectivo.body.id}/proyectos`)
    .send({ titulo: "P", descripcion: "d", perfiles })
    .expect(201);
  const persona = await api
    .post("/colaboradores")
    .send({ cuentaGit: "ada", codigosHabilidades: [CODIGOS.node] })
    .expect(201);
  return { api, proyecto: proyecto.body, colaboradorId: persona.body.id };
}

describe("HTTP · postulaciones por perfil y retiro", () => {
  test("se puede postular a otro perfil del mismo proyecto, pero no repetir el perfil", async () => {
    const { api, proyecto, colaboradorId } = await prepararProyecto(2);
    const [uno, otro] = proyecto.perfiles;
    const ruta = `/proyectos/${proyecto.id}/colaboraciones`;

    await api.post(ruta).send({ colaboradorId, perfilId: uno.id }).expect(201);
    await api.post(ruta).send({ colaboradorId, perfilId: otro.id }).expect(201);
    await api.post(ruta).send({ colaboradorId, perfilId: uno.id }).expect(409);
  });

  test("retirar una pendiente la deja RETIRADA y permite volver a postularse", async () => {
    const { api, proyecto, colaboradorId } = await prepararProyecto();
    const perfilId = proyecto.perfiles[0].id;
    const ruta = `/proyectos/${proyecto.id}/colaboraciones`;
    const postulacion = await api
      .post(ruta)
      .send({ colaboradorId, perfilId })
      .expect(201);

    const retirada = await api.post(`${ruta}/${postulacion.body.id}/retiro`).expect(200);
    expect(retirada.body.estado).toBe("RETIRADA");
    await api.post(`${ruta}/${postulacion.body.id}/retiro`).expect(409);
    await api.post(ruta).send({ colaboradorId, perfilId }).expect(201);
  });

  test("no se puede retirar una postulacion ya aceptada", async () => {
    const { api, proyecto, colaboradorId } = await prepararProyecto();
    const ruta = `/proyectos/${proyecto.id}/colaboraciones`;
    const postulacion = await api
      .post(ruta)
      .send({ colaboradorId, perfilId: proyecto.perfiles[0].id })
      .expect(201);
    await api.post(`${ruta}/${postulacion.body.id}/aceptacion`).expect(200);
    await api.post(`${ruta}/${postulacion.body.id}/retiro`).expect(409);
  });
});

describe("HTTP · invitaciones, logros y lecturas", () => {
  test("invitar dos veces a la misma persona al mismo perfil da 409", async () => {
    const { api, proyecto, colaboradorId } = await prepararProyecto();
    const ruta = `/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}/invitaciones`;
    await api.post(ruta).send({ colaboradorId, mensaje: "Sumate" }).expect(201);
    await api.post(ruta).send({ colaboradorId, mensaje: "Sumate" }).expect(409);
  });

  test("un mensaje de invitacion de mas de 500 caracteres es invalido", async () => {
    const { api, proyecto, colaboradorId } = await prepararProyecto();
    const ruta = `/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}/invitaciones`;
    await api
      .post(ruta)
      .send({ colaboradorId, mensaje: "a".repeat(501) })
      .expect(400);
  });

  test("invitar a quien no acepta mensajeria interna da 409", async () => {
    const { api, proyecto } = await prepararProyecto();
    const silenciosa = await api
      .post("/colaboradores")
      .send({
        cuentaGit: "grace",
        codigosHabilidades: [CODIGOS.node],
        recibeMensajeriaInterna: false,
      })
      .expect(201);
    await api
      .post(`/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}/invitaciones`)
      .send({ colaboradorId: silenciosa.body.id })
      .expect(409);
  });

  test("los logros no repiten titulo (sin distinguir mayusculas) y tienen largo maximo", async () => {
    const { api, proyecto } = await prepararProyecto();
    const ruta = `/proyectos/${proyecto.id}/logros`;
    await api.post(ruta).send({ titulo: "Primer deploy", descripcion: "ok" }).expect(201);
    await api.post(ruta).send({ titulo: "PRIMER DEPLOY", descripcion: "ok" }).expect(409);
    await api
      .post(ruta)
      .send({ titulo: "a".repeat(101), descripcion: "ok" })
      .expect(400);
    await api
      .post(ruta)
      .send({ titulo: "Otro", descripcion: "a".repeat(1001) })
      .expect(400);
  });

  test("las mutaciones sobre un proyecto finalizado dan 409", async () => {
    const { api, proyecto } = await prepararProyecto();
    await api.post(`/proyectos/${proyecto.id}/finalizacion`).expect(200);
    await api
      .post(`/proyectos/${proyecto.id}/logros`)
      .send({ titulo: "Tarde", descripcion: "ok" })
      .expect(409);
  });

  test("marcar como leida una notificacion ya leida responde igual", async () => {
    const { api, proyecto, colaboradorId } = await prepararProyecto();
    await api
      .post(`/proyectos/${proyecto.id}/perfiles/${proyecto.perfiles[0].id}/invitaciones`)
      .send({ colaboradorId })
      .expect(201);
    const bandeja = await api
      .get(`/colaboradores/${colaboradorId}/notificaciones`)
      .expect(200);
    const ruta = `/colaboradores/${colaboradorId}/notificaciones/${bandeja.body.data[0].id}/lectura`;

    expect((await api.post(ruta).expect(200)).body.esLeida).toBe(true);
    expect((await api.post(ruta).expect(200)).body.esLeida).toBe(true);
  });
});
