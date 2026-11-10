import mongoose from "mongoose";
import { usarBaseDeTest, armarServicesConMongo } from "./baseDeTest.js";
import { ColectivoModel } from "../../src/models/ColectivoModel.js";
import { ColaboradorModel } from "../../src/models/ColaboradorModel.js";
import { ContextoUsuarioModel } from "../../src/models/ContextoUsuarioModel.js";
import { UsuarioModel } from "../../src/models/UsuarioModel.js";
import { IdentidadExternaModel } from "../../src/models/IdentidadExternaModel.js";
import { asegurarValidadores } from "../../src/models/validadoresDeColecciones.js";
import { migrarCuentasAContextos } from "../../src/migraciones/001-cuentasAContextos.js";
import { SolicitudIngresoModel } from "../../src/models/SolicitudIngresoModel.js";

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

  test("los indices impiden dos lideres activos y dos perfiles de colaboradora", async () => {
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

  test("la migracion pasa las cuentas a contextos y se puede correr dos veces", async () => {
    const conDueno = await ColectivoModel.create({
      ...alta("Con dueño"),
      cuentaId: "sub-1",
    });
    await ColectivoModel.create(alta("Sin dueño"));
    await ColectivoModel.create({
      ...alta("De baja"),
      cuentaId: "sub-3",
      fechaBaja: new Date(),
    });
    const persona = await ColaboradorModel.create({
      cuentaGit: "ada",
      cuentaId: "sub-2",
    });

    const primera = await migrarCuentasAContextos();
    const segunda = await migrarCuentasAContextos();

    expect(primera).toMatchObject({
      usuariosCreados: 2,
      contextosDeColectivo: 1,
      contextosDeColaborador: 1,
      conflictos: [],
    });
    expect(primera.colectivosSinLider).toHaveLength(1);
    expect(segunda).toMatchObject({
      usuariosCreados: 0,
      contextosDeColectivo: 0,
      contextosDeColaborador: 0,
    });
    expect(await IdentidadExternaModel.countDocuments({ proveedor: "logto" })).toBe(2);

    const identidad = await IdentidadExternaModel.findOne({ sub: "sub-1" });
    const usuarioMigrado = await UsuarioModel.findById(identidad.usuarioId);
    const contexto = await ContextoUsuarioModel.findById(usuarioMigrado.contextoActualId);
    expect(contexto).toMatchObject({ rol: "LIDER" });
    expect(String(contexto.colectivoId)).toBe(String(conDueno._id));
    expect(
      await ContextoUsuarioModel.exists({
        colaboradorId: persona._id,
        rol: "COLABORADOR",
      }),
    ).toBeTruthy();

    const indices = await ColectivoModel.collection.indexes();
    expect(indices.map((i) => i.name)).not.toContain("cuentaId_1");
  });
});
