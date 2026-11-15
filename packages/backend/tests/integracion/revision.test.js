import { componerApp, crearCanalesEnMemoria } from "../../src/composicion.js";
import { ColaboradorModel } from "../../src/models/ColaboradorModel.js";
import { migrarPersonasSinDuplicados } from "../../src/migraciones/005-personasSinDuplicados.js";
import { jest } from "@jest/globals";
import {
  armarServices,
  crearProyectoDePrueba,
  crearColaboradorDePrueba,
  datosDePerfil,
  CODIGOS,
} from "../fixtures.js";
import { armarApp } from "../http/app.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { ConcurrenciaError } from "../../src/errors/ConcurrenciaError.js";
import { MongoNotificacionRepository } from "../../src/repositories/MongoNotificacionRepository.js";
import { NotificacionModel } from "../../src/models/NotificacionModel.js";
import { AvisoPendienteModel } from "../../src/models/AvisoPendienteModel.js";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { ColaboracionModel } from "../../src/models/ColaboracionModel.js";

let s;
beforeEach(async () => {
  s = await armarServices();
});
afterEach(() => jest.restoreAllMocks());
const postular = (proyecto, persona) =>
  s.colaboracionService.registrar({
    proyectoId: proyecto.id,
    perfilId: proyecto.perfiles[0].id,
    colaboradorId: persona.id,
  });

test("no elimina un perfil con postulaciones y la postulación sigue resolviéndose", async () => {
  const { proyecto } = await crearProyectoDePrueba(s);
  await s.perfilService.actualizar(proyecto.id, proyecto.perfiles[0].id, {
    modoAceptacion: "REVISION_MANUAL",
  });
  await s.perfilService.crear(proyecto.id, datosDePerfil());
  const persona = await crearColaboradorDePrueba(s.colaboradorService);
  const c = await postular(proyecto, persona);
  await expect(
    s.perfilService.eliminar(proyecto.id, proyecto.perfiles[0].id),
  ).rejects.toBeInstanceOf(ConflictError);
  expect((await s.colaboracionService.aceptar(proyecto.id, c.id)).estado).toBe(
    "ACEPTADA",
  );
});

test("actualizar el colectivo revierte ambas escrituras si falla la copia en proyectos", async () => {
  const { colectivo, proyecto } = await crearProyectoDePrueba(s);
  jest
    .spyOn(s.colectivoService.proyectoRepository, "actualizarDatosDelColectivo")
    .mockRejectedValueOnce(new Error("falla controlada"));
  await expect(
    s.colectivoService.actualizar(colectivo.id, { nombre: "Cambio" }),
  ).rejects.toThrow("falla controlada");
  expect((await s.colectivoService.buscarPorId(colectivo.id)).nombre).toBe(
    colectivo.nombre,
  );
  expect((await s.proyectoService.buscarPorId(proyecto.id)).colectivo.nombre).toBe(
    colectivo.nombre,
  );
});

test("una aceptación sin notificación revierte y permite reintentar", async () => {
  const { proyecto } = await crearProyectoDePrueba(s);
  await s.perfilService.actualizar(proyecto.id, proyecto.perfiles[0].id, {
    modoAceptacion: "REVISION_MANUAL",
  });
  const c = await postular(
    proyecto,
    await crearColaboradorDePrueba(s.colaboradorService),
  );
  jest
    .spyOn(s.notificacionService, "notificar")
    .mockRejectedValueOnce(new Error("no se pudo encolar"));
  await expect(s.colaboracionService.aceptar(proyecto.id, c.id)).rejects.toThrow(
    "no se pudo encolar",
  );
  expect(
    (await s.proyectoService.buscarPorId(proyecto.id)).buscarColaboracion(c.id).estado,
  ).toBe("PENDIENTE");
  await s.colaboracionService.aceptar(proyecto.id, c.id);
  expect(
    await NotificacionModel.countDocuments({ "referencias.colaboracionId": c.id }),
  ).toBe(1);
});

test("reservas con el mismo vencimiento toman distintos medios y un dueño anterior no confirma", async () => {
  const repo = new MongoNotificacionRepository();
  const persona = await crearColaboradorDePrueba(s.colaboradorService);
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 300_000);
  await repo.crear({
    destinatarioId: persona.id,
    tipo: "INVITACION",
    asunto: "a",
    contenido: "c",
    envios: [
      { canal: "EMAIL", destino: "a@example.com", proximoIntento: new Date(0) },
      { canal: "SMS", destino: "+541155551234", proximoIntento: new Date(0) },
    ],
  });
  const primero = await repo.tomarEnvioPendiente(ahora, hasta);
  const segundo = await repo.tomarEnvioPendiente(ahora, hasta);
  expect(primero.envio.id).not.toBe(segundo.envio.id);
  const nuevo = await repo.tomarEnvioPendiente(
    hasta,
    new Date(hasta.getTime() + 300_000),
  );
  expect(nuevo.envio.id).toBe(primero.envio.id);
  expect(
    await repo.actualizarEnvio(
      primero.notificacion.id,
      primero.envio.id,
      primero.envio.reservaId,
      { estado: "ENVIADO" },
    ),
  ).toBe(false);
});

test("el retiro y otro perfil no excluyen un proyecto compatible", async () => {
  const { proyecto } = await crearProyectoDePrueba(s);
  await s.perfilService.actualizar(proyecto.id, proyecto.perfiles[0].id, {
    modoAceptacion: "REVISION_MANUAL",
  });
  const persona = await crearColaboradorDePrueba(s.colaboradorService);
  const c = await postular(proyecto, persona);
  await s.colaboracionService.retirar(proyecto.id, c.id);
  expect(
    (await s.reclutamientoService.buscarProyectos(persona.id)).items.map((p) => p.id),
  ).toContain(proyecto.id);
  await postular(proyecto, persona);
  await s.perfilService.crear(proyecto.id, datosDePerfil());
  expect(
    (await s.reclutamientoService.buscarProyectos(persona.id)).items.map((p) => p.id),
  ).toContain(proyecto.id);
});

test("un vencimiento se aplica a búsqueda, invitación y resumen sin esperar al job", async () => {
  const { proyecto } = await crearProyectoDePrueba(s);
  const persona = await crearColaboradorDePrueba(s.colaboradorService);
  await ProyectoModel.updateOne(
    { _id: proyecto.id },
    { fechaCierre: new Date(Date.now() - 1000) },
  );
  expect(
    (await s.reclutamientoService.buscarProyectos(persona.id)).items.map((p) => p.id),
  ).not.toContain(proyecto.id);
  await expect(
    s.reclutamientoService.invitar(proyecto.id, proyecto.perfiles[0].id, {
      colaboradorId: persona.id,
    }),
  ).rejects.toBeInstanceOf(ConflictError);
  expect((await s.proyectoService.listar()).items[0].perfiles[0].estadoBusqueda).toBe(
    "CERRADA",
  );
});

test("la misma habilidad agregada desde dos lecturas no queda duplicada", async () => {
  const persona = await crearColaboradorDePrueba(s.colaboradorService);
  const repo = s.colaboradorService.colaboradorRepository;
  const primero = await repo.buscarPorId(persona.id);
  const segundo = await repo.buscarPorId(persona.id);
  const [habilidad] = await s.habilidadService.resolverPorCodigos([CODIGOS.react]);
  primero.agregarHabilidad(habilidad);
  segundo.agregarHabilidad(habilidad);
  await repo.guardar(primero);
  await expect(repo.guardar(segundo)).rejects.toBeInstanceOf(ConcurrenciaError);
  expect((await repo.buscarPorId(persona.id)).habilidades.map((h) => h.codigo)).toEqual([
    CODIGOS.node,
    CODIGOS.react,
  ]);
});

test("resolver códigos conserva orden y repetidos con una única consulta", async () => {
  const repo = s.habilidadService.habilidadRepository;
  const consultar = jest.spyOn(repo, "buscarPorCodigos");
  const individual = jest.spyOn(repo, "buscarPorCodigo");
  const codigos = [CODIGOS.react, CODIGOS.node, CODIGOS.react];
  expect(
    (await s.habilidadService.resolverPorCodigos(codigos)).map((h) => h.codigo),
  ).toEqual(codigos);
  expect(consultar).toHaveBeenCalledTimes(1);
  expect(individual).not.toHaveBeenCalled();
});

test("el alta y la intención durable de avisar se confirman juntas", async () => {
  const { colectivo } = await crearProyectoDePrueba(s);
  jest
    .spyOn(s.avisoAutomaticoService.avisoRepository, "encolar")
    .mockRejectedValueOnce(new Error("cola caída"));
  await expect(
    s.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo: "Sin commit",
      descripcion: "d",
      perfiles: [datosDePerfil()],
    }),
  ).rejects.toThrow("cola caída");
  expect(await ProyectoModel.countDocuments({ titulo: "Sin commit" })).toBe(0);
});

test("el job de avisos reintenta una tarea sin duplicar notificaciones", async () => {
  const persona = await crearColaboradorDePrueba(s.colaboradorService);
  await s.avisoAutomaticoService.procesarPendientes();
  const { proyecto } = await crearProyectoDePrueba(s);
  const actualizar = jest
    .spyOn(s.avisoAutomaticoService.avisoRepository, "actualizar")
    .mockRejectedValueOnce(new Error("caída después de notificar"));
  await s.avisoAutomaticoService.procesarPendientes();
  actualizar.mockRestore();
  await s.avisoAutomaticoService.procesarPendientes(new Date(Date.now() + 600_000), {
    tope: 100,
  });
  await s.avisoAutomaticoService.procesarPendientes(new Date(Date.now() + 1_200_000), {
    tope: 100,
  });
  expect(
    await NotificacionModel.countDocuments({
      destinatarioId: persona.id,
      "referencias.proyectoIds": proyecto.id,
    }),
  ).toBe(1);
  expect(await AvisoPendienteModel.countDocuments({ estado: "PENDIENTE" })).toBe(0);
});

test("un aviso interrumpido queda pendiente y se recupera al reiniciar el servicio", async () => {
  await crearColaboradorDePrueba(s.colaboradorService, { cuentaGit: "primera" });
  await crearColaboradorDePrueba(s.colaboradorService, { cuentaGit: "segunda" });
  await s.avisoAutomaticoService.procesarPendientes();
  const { proyecto } = await crearProyectoDePrueba(s);
  let detener = false;
  const notificar = s.notificacionService.notificar.bind(s.notificacionService);
  const notificaciones = jest
    .spyOn(s.notificacionService, "notificar")
    .mockImplementation(async (...datos) => {
      const resultado = await notificar(...datos);
      detener = true;
      return resultado;
    });
  await s.avisoAutomaticoService.procesarPendientes(new Date(), {
    debeDetenerse: () => detener,
  });
  expect(await AvisoPendienteModel.countDocuments({ estado: "PENDIENTE" })).toBe(1);
  notificaciones.mockRestore();
  // Otra composición conserva los trabajos persistidos: no vacía la base.
  const { services } = componerApp({ canales: crearCanalesEnMemoria() });
  await services.avisoAutomaticoService.procesarPendientes();
  expect(
    await NotificacionModel.countDocuments({ "referencias.proyectoIds": proyecto.id }),
  ).toBe(2);
  expect(await AvisoPendienteModel.countDocuments({ estado: "PENDIENTE" })).toBe(0);
});

test("las lecturas de listado no reconstruyen historiales y el detalle los pagina", async () => {
  const { proyecto } = await crearProyectoDePrueba(s);
  const persona = await crearColaboradorDePrueba(s.colaboradorService);
  await ColaboracionModel.insertMany(
    Array.from({ length: 45 }, () => ({
      proyectoId: proyecto.id,
      colectivoId: proyecto.colectivoId,
      perfil: proyecto.perfiles[0].id,
      colaborador: persona.id,
      estado: "ACEPTADA",
    })),
  );
  const reconstruir = jest.spyOn(
    s.proyectoService.proyectoRepository,
    "conColaboraciones",
  );
  const pagina = await s.proyectoService.listar();
  expect(pagina.items[0]).not.toHaveProperty("colaboraciones");
  expect(reconstruir).not.toHaveBeenCalled();
  const detalle = await s.proyectoService.verDetalle(proyecto.id);
  expect(detalle.proyecto.colaboraciones).toHaveLength(20);
  expect(detalle.proyecto.colaboracionesMeta.total).toBe(45);
  const segunda = await s.colaboracionService.listarPaginaPorProyecto(proyecto.id, {
    numeroPagina: 2,
    limitePorPagina: 20,
  });
  expect(segunda.items).toHaveLength(20);
  expect(
    new Set([...detalle.proyecto.colaboraciones, ...segunda.items].map((c) => c.id)).size,
  ).toBe(40);
});

test("HTTP distingue 413 y conserva código y autolinks de Markdown", async () => {
  const { api } = await armarApp();
  await api
    .post("/colectivos")
    .send({ descripcion: "x".repeat(110000) })
    .expect(413);
  const descripcion =
    "Ejemplo: `Array<string>` y <https://example.com>.\n\n```html\n<script>ejemplo()</script>\n```";
  const alta = await api
    .post("/colectivos")
    .send({ nombre: "ONG", descripcion, tipoColectivo: "ONG" })
    .expect(201);
  expect(alta.body.descripcion).toBe(descripcion);
  expect(alta.headers).not.toHaveProperty("x-powered-by");
  expect(alta.headers["x-content-type-options"]).toBe("nosniff");
  await api.get("/ready").expect(200);
});

test("la migración limpia duplicados históricos y es idempotente", async () => {
  const persona = await crearColaboradorDePrueba(s.colaboradorService);
  await ColaboradorModel.collection.updateOne(
    { _id: persona._id },
    {
      $set: {
        habilidades: [
          { codigo: "node", titulo: "Primero" },
          { codigo: "node", titulo: "Repetido" },
        ],
        pronombres: ["ella", "ella", "elle"],
        mediosDeContacto: [
          { tipo: "EMAIL", valor: "a@example.com" },
          { tipo: "EMAIL", valor: "a@example.com" },
        ],
      },
    },
  );
  expect(await migrarPersonasSinDuplicados()).toEqual({ corregidas: 1 });
  expect(await migrarPersonasSinDuplicados()).toEqual({ corregidas: 0 });
  const actual = await ColaboradorModel.findById(persona.id);
  expect(actual.habilidades.map((h) => h.titulo)).toEqual(["Primero"]);
  expect(actual.pronombres).toEqual(["ella", "elle"]);
  expect(actual.mediosDeContacto).toHaveLength(1);
  await expect(actual.validate()).resolves.toBeUndefined();
});

test("una proyección de detalle no se puede guardar como agregado completo", async () => {
  const { proyecto } = await crearProyectoDePrueba(s);
  const { proyecto: lectura } = await s.proyectoService.verDetalle(proyecto.id);
  await expect(s.proyectoService.proyectoRepository.guardar(lectura)).rejects.toThrow(
    "respuesta de lectura",
  );
});
