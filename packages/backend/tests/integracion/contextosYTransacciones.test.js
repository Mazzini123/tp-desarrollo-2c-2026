import mongoose from "mongoose";
import { usarBaseDeTest, armarServicesConMongo } from "./baseDeTest.js";
import { asegurarIndices } from "../../src/config/db.js";
import { migrarIndiceDeColaboradorActivo } from "../../src/migraciones/004-indiceDeColaboradorActivo.js";
import { IdentidadExternaModel } from "../../src/security/persistencia/IdentidadExternaModel.js";
import { NotificacionModel } from "../../src/models/NotificacionModel.js";
import { CODIGOS, datosDePerfil, proyectosDelColectivo } from "../fixtures.js";
import { ColectivoModel } from "../../src/models/ColectivoModel.js";
import { ColaboradorModel } from "../../src/models/ColaboradorModel.js";
import { ContextoUsuarioModel } from "../../src/security/persistencia/ContextoUsuarioModel.js";
import { UsuarioModel } from "../../src/security/persistencia/UsuarioModel.js";
import { asegurarValidadores } from "../../src/security/persistencia/validadoresDeColecciones.js";
import { SolicitudIngresoModel } from "../../src/security/persistencia/SolicitudIngresoModel.js";

/**
 * Necesitan el Mongo de docker-compose, que ahora es un replica set de un nodo:
 * sin replica set no hay transacciones.
 */
usarBaseDeTest();

const ObjectId = () => new mongoose.Types.ObjectId();
const alta = (nombre) => ({ nombre, descripcion: "d", tipoColectivo: "ONG" });

describe("Integracion · contextos, transacciones e indices", () => {
  let services;

  beforeEach(async () => {
    services = await armarServicesConMongo();
    await asegurarValidadores();
  });

  async function usuario(sub) {
    return (await services.registroService.registrar({ proveedor: "prueba", sub }))
      .usuario;
  }

  test("si falla una parte del alta, no queda un colectivo sin lider", async () => {
    const ana = await usuario("ana");
    const repositorio = services.modalidadService.contextoUsuarioRepository;
    const crear = repositorio.crear;
    repositorio.crear = async () => {
      throw new Error("falla inyectada");
    };

    await expect(
      services.modalidadService.crearColectivo(ana, alta("A")),
    ).rejects.toThrow("falla inyectada");
    repositorio.crear = crear;

    expect(await ColectivoModel.countDocuments()).toBe(0);
    expect((await UsuarioModel.findById(ana._id)).contextoActualId).toBeNull();
  });

  test("el alta completa deja colectivo, contexto LIDER y contexto actual", async () => {
    const ana = await usuario("ana");
    const colectivo = await services.modalidadService.crearColectivo(ana, alta("A"));

    const contexto = await ContextoUsuarioModel.findOne({ colectivoId: colectivo._id });
    expect(contexto).toMatchObject({ rol: "LIDER", tipo: "COLECTIVO", activo: true });
    expect(String((await UsuarioModel.findById(ana._id)).contextoActualId)).toBe(
      String(contexto._id),
    );
  });

  test("el mismo sub en distintos proveedores pertenece a usuarios distintos", async () => {
    const a = await usuario("ana");
    const { usuario: b } = await services.registroService.registrar({
      proveedor: "otro",
      sub: "ana",
    });
    expect(a.id).not.toBe(b.id);
    expect(await IdentidadExternaModel.countDocuments({ sub: "ana" })).toBe(2);
  });

  test("el arranque crea los indices declarados y conserva indices ajenos", async () => {
    const coleccion = IdentidadExternaModel.collection;
    await coleccion.dropIndex("proveedor_1_sub_1");
    await coleccion.createIndex({ fechaAlta: 1 }, { name: "indice_de_operaciones" });
    await asegurarIndices();
    const indices = await coleccion.indexes();
    expect(indices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { proveedor: 1, sub: 1 }, unique: true }),
        expect.objectContaining({ name: "indice_de_operaciones" }),
      ]),
    );
    const solicitudes = await SolicitudIngresoModel.collection.indexes();
    expect(solicitudes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { colectivoId: 1, usuarioId: 1 },
          unique: true,
          partialFilterExpression: { estado: "PENDIENTE" },
        }),
      ]),
    );
  });

  test("los indices impiden dos lideres activos y dos perfiles de colaboradora activos", async () => {
    const colectivoId = ObjectId();
    await ContextoUsuarioModel.create({
      usuarioId: ObjectId(),
      tipo: "COLECTIVO",
      colectivoId,
      rol: "LIDER",
    });
    await expect(
      ContextoUsuarioModel.create({
        usuarioId: ObjectId(),
        tipo: "COLECTIVO",
        colectivoId,
        rol: "LIDER",
      }),
    ).rejects.toMatchObject({ code: 11000 });

    const usuarioId = ObjectId();
    await ContextoUsuarioModel.create({
      usuarioId,
      tipo: "COLABORADOR",
      colaboradorId: ObjectId(),
      rol: "COLABORADOR",
    });
    await expect(
      ContextoUsuarioModel.create({
        usuarioId,
        tipo: "COLABORADOR",
        colaboradorId: ObjectId(),
        rol: "COLABORADOR",
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  test("la migracion cambia solo el indice anterior y conserva los contextos historicos", async () => {
    const coleccion = ContextoUsuarioModel.collection;
    await coleccion.dropIndex("colaborador_activo_por_usuario");
    await coleccion.createIndex(
      { usuarioId: 1, tipo: 1 },
      { unique: true, partialFilterExpression: { tipo: "COLABORADOR" } },
    );
    await coleccion.createIndex({ fechaBaja: 1 }, { name: "indice_de_operaciones" });
    const usuarioId = ObjectId();
    const contexto = { usuarioId, tipo: "COLABORADOR", rol: "COLABORADOR" };
    const historico = await ContextoUsuarioModel.create({
      ...contexto,
      colaboradorId: ObjectId(),
      activo: false,
      fechaBaja: new Date(),
    });

    expect(await migrarIndiceDeColaboradorActivo()).toEqual({
      indiceAnteriorEliminado: true,
    });
    expect(await migrarIndiceDeColaboradorActivo()).toEqual({
      indiceAnteriorEliminado: false,
    });
    const indices = await coleccion.indexes();
    expect(indices.map(({ name }) => name)).not.toContain("usuarioId_1_tipo_1");
    expect(indices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "colaborador_activo_por_usuario",
          key: { usuarioId: 1 },
          unique: true,
          partialFilterExpression: { tipo: "COLABORADOR", activo: true },
        }),
        expect.objectContaining({ name: "indice_de_operaciones" }),
      ]),
    );

    await ContextoUsuarioModel.create({ ...contexto, colaboradorId: ObjectId() });
    await ContextoUsuarioModel.create({
      ...contexto,
      colaboradorId: ObjectId(),
      activo: false,
      fechaBaja: new Date(),
    });
    await expect(
      ContextoUsuarioModel.create({
        ...contexto,
        colaboradorId: ObjectId(),
      }),
    ).rejects.toMatchObject({ code: 11000 });
    expect(await ContextoUsuarioModel.findById(historico.id)).toMatchObject({
      activo: false,
      colaboradorId: historico.colaboradorId,
      fechaBaja: historico.fechaBaja,
    });
    expect(await ContextoUsuarioModel.countDocuments({ usuarioId })).toBe(3);
  });

  test("el validador de la base rechaza un contexto con las dos modalidades", async () => {
    await expect(
      ContextoUsuarioModel.collection.insertOne({
        usuarioId: ObjectId(),
        tipo: "COLECTIVO",
        rol: "LIDER",
        activo: true,
        colectivoId: ObjectId(),
        colaboradorId: ObjectId(),
      }),
    ).rejects.toMatchObject({ code: 121 });
  });

  test.each([
    ["COLABORADOR", "COLABORADOR", "colaboradorId", "colectivoId"],
    ["COLECTIVO", "MIEMBRO", "colectivoId", "colaboradorId"],
  ])(
    "el validador de %s exige ambos campos con el tipo correcto",
    async (tipo, rol, asociada, nula) => {
      const base = { usuarioId: ObjectId(), tipo, rol, activo: true };
      const coleccion = ContextoUsuarioModel.collection;
      await expect(
        coleccion.insertOne({ ...base, [asociada]: ObjectId() }),
      ).rejects.toMatchObject({ code: 121 });
      await expect(
        coleccion.insertOne({ ...base, [asociada]: String(ObjectId()), [nula]: null }),
      ).rejects.toMatchObject({ code: 121 });
      await expect(
        coleccion.insertOne({ ...base, [asociada]: ObjectId(), [nula]: null }),
      ).resolves.toMatchObject({ acknowledged: true });
    },
  );

  test("un error de collMod impide completar la preparacion de la base", async () => {
    const error = new Error("collMod sin permisos");
    await expect(
      asegurarValidadores({
        async createCollection() {
          throw Object.assign(new Error("ya existe"), { code: 48 });
        },
        async command() {
          throw error;
        },
      }),
    ).rejects.toBe(error);
  });

  test("dos transferencias de liderazgo a la vez dejan un solo lider", async () => {
    const ana = await usuario("ana");
    const colectivo = await services.modalidadService.crearColectivo(ana, alta("A"));
    const lider = await ContextoUsuarioModel.findOne({ colectivoId: colectivo._id });
    const miembros = [];
    for (const sub of ["caro", "dani"]) {
      const persona = await usuario(sub);
      miembros.push(
        await services.contextoService.contextoUsuarioRepository.habilitarMembresia(
          persona._id,
          colectivo._id,
        ),
      );
    }

    const resultados = await Promise.allSettled(
      miembros.map((m) =>
        services.liderazgoService.transferir(lider, String(colectivo._id), String(m._id)),
      ),
    );

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await ContextoUsuarioModel.countDocuments({
        colectivoId: colectivo._id,
        rol: "LIDER",
        activo: true,
      }),
    ).toBe(1);
  });

  test("la baja de colaboradora conserva el perfil y desactiva su contexto", async () => {
    const ada = await usuario("ada");
    const perfil = await services.modalidadService.crearPerfilColaborador(ada, {
      cuentaGit: "ada",
    });

    await services.modalidadService.darDeBajaPerfilColaborador(String(perfil._id));

    expect((await ColaboradorModel.findById(perfil._id)).fechaBaja).toBeTruthy();
    expect(
      await ContextoUsuarioModel.findOne({ colaboradorId: perfil._id }),
    ).toMatchObject({
      activo: false,
    });
    expect((await UsuarioModel.findById(ada._id)).contextoActualId).toBeNull();
  });

  test("la baja del colectivo cancela solicitudes y desactiva todas sus membresias", async () => {
    const ana = await usuario("ana");
    const colectivo = await services.modalidadService.crearColectivo(ana, alta("A"));
    const caro = await usuario("caro");
    await services.contextoService.contextoUsuarioRepository.habilitarMembresia(
      caro._id,
      colectivo._id,
    );
    const dani = await usuario("dani");
    await SolicitudIngresoModel.create({
      colectivoId: colectivo._id,
      usuarioId: dani._id,
    });

    await services.membresiaService.darDeBajaColectivo(String(colectivo._id));

    expect(
      await ContextoUsuarioModel.countDocuments({
        colectivoId: colectivo._id,
        activo: true,
      }),
    ).toBe(0);
    expect(
      await ContextoUsuarioModel.countDocuments({ colectivoId: colectivo._id }),
    ).toBe(2);
    expect((await SolicitudIngresoModel.findOne({ usuarioId: dani._id })).estado).toBe(
      "CANCELADA",
    );
    expect((await UsuarioModel.findById(ana._id)).contextoActualId).toBeNull();
  });

  async function crearProyecto(colectivoId) {
    return services.proyectoService.crear({
      colectivoId,
      titulo: "Proyecto",
      descripcion: "d",
      perfiles: [
        datosDePerfil({ requeridas: [CODIGOS.node], modoAceptacion: "REVISION_MANUAL" }),
      ],
    });
  }

  async function colaboradora() {
    const ada = await usuario("ada");
    const perfil = await services.modalidadService.crearPerfilColaborador(ada, {
      cuentaGit: "ada",
      codigosHabilidades: [CODIGOS.node],
    });
    return { ada, perfil };
  }

  const postular = (proyecto, perfil) =>
    services.colaboracionService.registrar({
      proyectoId: proyecto.id,
      perfilId: proyecto.perfiles[0].id,
      colaboradorId: perfil.id,
    });

  test("la baja y una postulacion concurrentes no dejan actividad en un perfil dado de baja", async () => {
    const colectivo = await services.colectivoService.crear(alta("A"));
    const proyecto = await crearProyecto(colectivo.id);
    const { ada, perfil } = await colaboradora();
    const resultados = await Promise.allSettled([
      services.modalidadService.darDeBajaPerfilColaborador(perfil.id),
      postular(proyecto, perfil),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const guardado = await ColaboradorModel.findById(perfil.id);
    const contexto = await ContextoUsuarioModel.findOne({ colaboradorId: perfil.id });
    const persona = await UsuarioModel.findById(ada.id);
    const actualizado = await services.proyectoService.buscarPorId(proyecto.id);
    if (guardado.fechaBaja) {
      expect(contexto.activo).toBe(false);
      expect(persona.contextoActualId).toBeNull();
      expect(actualizado.colaboraciones).toHaveLength(0);
    } else {
      expect(contexto.activo).toBe(true);
      expect(persona.contextoActualId).toEqual(contexto._id);
      expect(actualizado.colaboraciones).toHaveLength(1);
      expect(actualizado.colaboraciones[0].estado).toBe("PENDIENTE");
    }
  });

  test("las altas concurrentes de modalidades opuestas dejan un solo contexto valido", async () => {
    const ada = await usuario("ada");
    const resultados = await Promise.allSettled([
      services.modalidadService.crearColectivo(ada, alta("A")),
      services.modalidadService.crearPerfilColaborador(ada, { cuentaGit: "ada" }),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected").reason).toMatchObject({
      codigo: "MODALIDAD_INCOMPATIBLE",
    });
    const contextos = await ContextoUsuarioModel.find({ usuarioId: ada._id });
    expect(contextos).toHaveLength(1);
    expect((await UsuarioModel.findById(ada.id)).contextoActualId).toEqual(
      contextos[0]._id,
    );
    expect(
      (await ColectivoModel.countDocuments()) + (await ColaboradorModel.countDocuments()),
    ).toBe(1);
  });

  test("aceptaciones concurrentes resuelven una sola vez y permiten un segundo colectivo", async () => {
    const ana = await usuario("ana");
    const ada = await usuario("ada");
    await services.modalidadService.crearColectivo(ada, alta("B"));
    const anterior = (await UsuarioModel.findById(ada.id)).contextoActualId;
    const colectivo = await services.modalidadService.crearColectivo(ana, alta("A"));
    const lider = await ContextoUsuarioModel.findOne({ colectivoId: colectivo.id });
    const solicitud = await services.membresiaService.solicitarIngreso(ada, colectivo.id);
    expect(await ContextoUsuarioModel.countDocuments({ usuarioId: ada._id })).toBe(1);

    const resolver = () =>
      services.membresiaService.aceptar(lider, colectivo.id, solicitud.id);
    const resultados = await Promise.allSettled([resolver(), resolver()]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected").reason).toMatchObject({
      codigo: "SOLICITUD_YA_RESUELTA",
    });
    expect(await SolicitudIngresoModel.findById(solicitud.id)).toMatchObject({
      estado: "ACEPTADA",
    });
    expect(
      await ContextoUsuarioModel.findOne({
        usuarioId: ada._id,
        colectivoId: colectivo.id,
      }),
    ).toMatchObject({ rol: "MIEMBRO", activo: true });
    expect((await UsuarioModel.findById(ada.id)).contextoActualId).toEqual(anterior);
  });

  test("aceptar una solicitud de quien paso a colaboradora conserva la solicitud pendiente", async () => {
    const ana = await usuario("ana");
    const ada = await usuario("ada");
    const colectivo = await services.modalidadService.crearColectivo(ana, alta("A"));
    const lider = await ContextoUsuarioModel.findOne({ colectivoId: colectivo.id });
    const solicitud = await services.membresiaService.solicitarIngreso(ada, colectivo.id);
    await services.modalidadService.crearPerfilColaborador(ada, { cuentaGit: "ada" });

    await expect(
      services.membresiaService.aceptar(lider, colectivo.id, solicitud.id),
    ).rejects.toMatchObject({ codigo: "MODALIDAD_INCOMPATIBLE" });
    expect(await SolicitudIngresoModel.findById(solicitud.id)).toMatchObject({
      estado: "PENDIENTE",
    });
    expect(
      await ContextoUsuarioModel.countDocuments({
        usuarioId: ada._id,
        tipo: "COLECTIVO",
      }),
    ).toBe(0);
  });

  test("una falla al final de la baja revierte proyectos, postulaciones, membresias, solicitudes y avisos", async () => {
    const ana = await usuario("ana");
    const colectivo = await services.modalidadService.crearColectivo(ana, alta("A"));
    const contexto = await ContextoUsuarioModel.findOne({ colectivoId: colectivo.id });
    const otro = await usuario("otro");
    const solicitud = await services.membresiaService.solicitarIngreso(
      otro,
      colectivo.id,
    );
    const proyecto = await crearProyecto(colectivo.id);
    const { perfil } = await colaboradora();
    const postulacion = await postular(proyecto, perfil);

    const repo = services.membresiaService.usuarioRepository;
    const limpiar = repo.limpiarContextosActuales;
    repo.limpiarContextosActuales = async function (ids) {
      await limpiar.call(this, ids);
      throw new Error("falla final");
    };

    await expect(
      services.membresiaService.darDeBajaColectivo(colectivo.id),
    ).rejects.toThrow("falla final");
    expect((await ColectivoModel.findById(colectivo.id)).fechaBaja).toBeNull();
    expect((await ContextoUsuarioModel.findById(contexto.id)).activo).toBe(true);
    expect((await UsuarioModel.findById(ana.id)).contextoActualId).toEqual(contexto._id);
    expect((await SolicitudIngresoModel.findById(solicitud.id)).estado).toBe("PENDIENTE");
    const abierto = await services.proyectoService.buscarPorId(proyecto.id);
    expect(abierto.estado).toBe("ABIERTO");
    expect(abierto.buscarColaboracion(postulacion.id).estado).toBe("PENDIENTE");
    const filtroAviso = { tipo: "POSTULACION_RECHAZADA", destinatarioId: perfil._id };
    expect(await NotificacionModel.countDocuments(filtroAviso)).toBe(0);

    repo.limpiarContextosActuales = limpiar;
    await services.membresiaService.darDeBajaColectivo(colectivo.id);
    const cerrado = await services.proyectoService.buscarPorId(proyecto.id);
    expect(cerrado.estado).toBe("FINALIZADO");
    expect(cerrado.buscarColaboracion(postulacion.id).estado).toBe("RECHAZADA");
    expect(await NotificacionModel.countDocuments(filtroAviso)).toBe(1);
  });

  test("una baja concurrente con publicar o solicitar ingreso no deja referencias activas", async () => {
    const ana = await usuario("ana");
    const ada = await usuario("ada");
    const colectivo = await services.modalidadService.crearColectivo(ana, alta("A"));
    const resultados = await Promise.allSettled([
      services.membresiaService.darDeBajaColectivo(colectivo.id),
      crearProyecto(colectivo.id),
      services.membresiaService.solicitarIngreso(ada, colectivo.id),
    ]);
    expect(resultados[0].status).toBe("fulfilled");
    for (const resultado of resultados.slice(1)) {
      if (resultado.status === "rejected") expect(resultado.reason.status).toBe(409);
    }
    const proyectos = await proyectosDelColectivo(colectivo.id);
    expect(proyectos.filter((p) => p.estaAbierto())).toHaveLength(0);
    expect(
      await SolicitudIngresoModel.countDocuments({
        colectivoId: colectivo.id,
        estado: "PENDIENTE",
      }),
    ).toBe(0);
    expect(
      await ContextoUsuarioModel.countDocuments({
        colectivoId: colectivo.id,
        activo: true,
      }),
    ).toBe(0);
  });

  test("seleccionar un contexto mientras se lo desactiva no deja un puntero invalido", async () => {
    const ana = await usuario("ana");
    const colectivo = await services.modalidadService.crearColectivo(ana, alta("A"));
    const contexto = await ContextoUsuarioModel.findOne({ colectivoId: colectivo.id });
    await services.contextoService.limpiarActual(ana);

    const [baja] = await Promise.allSettled([
      services.membresiaService.darDeBajaColectivo(colectivo.id),
      services.contextoService.seleccionar(ana, contexto.id),
    ]);
    expect(baja.status).toBe("fulfilled");
    expect((await UsuarioModel.findById(ana.id)).contextoActualId).toBeNull();
    expect((await ContextoUsuarioModel.findById(contexto.id)).activo).toBe(false);
  });
});
