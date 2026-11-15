import mongoose from "mongoose";
import { armarServicesConMongo } from "./baseDeTest.js";
import { PROVEEDORES_DE_PRUEBA } from "../soporte/base.js";
import { conReferencias, idDeRol, idDeTipoDeContexto } from "../soporte/contextos.js";
import { asegurarCatalogos } from "../../src/security/catalogosSeed.js";
import { MongoCatalogoRepository } from "../../src/security/persistencia/MongoCatalogoRepository.js";
import {
  asegurarValidadores,
  exigirModeloVigente,
} from "../../src/security/persistencia/validadoresDeColecciones.js";
import {
  PermisoModel,
  ProveedorAutentificadorModel,
  RolModel,
  RolXPermisoModel,
  TipoContextoModel,
} from "../../src/security/persistencia/catalogos.js";
import { ContextoUsuarioModel } from "../../src/security/persistencia/ContextoUsuarioModel.js";
import { IdentidadExternaModel } from "../../src/security/persistencia/IdentidadExternaModel.js";
import { UsuarioModel } from "../../src/security/persistencia/UsuarioModel.js";
import { PERMISO } from "../../src/security/autorizacion/enums/PERMISO.js";
import { ROLES } from "../../src/security/autorizacion/rolesYPermisos.js";
import { CatalogoDeRoles } from "../../src/security/autorizacion/CatalogoDeRoles.js";

const ObjectId = mongoose.Types.ObjectId;
const esObjectId = (valor) => valor instanceof ObjectId;
const alta = (nombre) => ({ nombre, descripcion: "d", tipoColectivo: "ONG" });
const DUPLICADO = { code: 11000 };
const RECHAZADO_POR_EL_VALIDADOR = { code: 121 };

// El modelo documental conserva cada clase del diseño como una coleccion
// propia, con referencias por ObjectId y sin datos embebidos que las reemplacen.
describe("Integracion · modelo de seguridad fiel al diseño", () => {
  let services;

  beforeEach(async () => {
    services = await armarServicesConMongo();
  });

  const crudo = (modelo, filtro = {}) => modelo.collection.findOne(filtro);
  const registrar = async (sub, proveedor = "prueba") =>
    (await services.registroService.registrar({ proveedor, sub })).usuario;

  test("cada clase del diseño tiene su coleccion", async () => {
    const ana = await registrar("ana");
    await services.modalidadService.crearColectivo(ana, alta("A"));

    const colecciones = (await mongoose.connection.db.listCollections().toArray()).map(
      (c) => c.name,
    );
    expect(colecciones).toEqual(
      expect.arrayContaining([
        "usuarios",
        "contextosUsuario",
        "tiposContexto",
        "roles",
        "permisos",
        "rolesXPermisos",
        "identidadesExternas",
        "proveedoresAutentificadores",
        "colectivos",
        "colaboradors",
      ]),
    );
  });

  test("Usuario referencia a su IdentidadExterna y esta a su ProveedorAutentificador", async () => {
    const ana = await registrar("ana");

    const usuario = await crudo(UsuarioModel, { _id: ana._id });
    const identidad = await crudo(IdentidadExternaModel, {
      _id: usuario.identidadExternaId,
    });
    const proveedor = await crudo(ProveedorAutentificadorModel, {
      _id: identidad.proveedorId,
    });

    expect(esObjectId(usuario.identidadExternaId)).toBe(true);
    expect(usuario.contextoActualId).toBeNull();
    expect(esObjectId(identidad.proveedorId)).toBe(true);
    expect(identidad.identificadorExterno).toBe("ana");
    expect(proveedor.proveedor).toBe("prueba");
    // Nada reemplaza a las referencias: ni la identidad embebida en el usuario,
    // ni el proveedor como texto, ni la relacion invertida.
    expect(usuario).not.toHaveProperty("identidadExterna");
    expect(identidad).not.toHaveProperty("proveedor");
    expect(identidad).not.toHaveProperty("sub");
    expect(identidad).not.toHaveProperty("usuarioId");
  });

  test("ContextoUsuario referencia a Usuario, TipoContexto, Rol y a su colectivo o colaborador", async () => {
    const ana = await registrar("ana");
    const ada = await registrar("ada");
    const colectivo = await services.modalidadService.crearColectivo(ana, alta("A"));
    const perfil = await services.modalidadService.crearPerfilColaborador(ada, {
      cuentaGit: "ada",
    });

    const deColectivo = await crudo(ContextoUsuarioModel, { usuarioId: ana._id });
    const deColaborador = await crudo(ContextoUsuarioModel, { usuarioId: ada._id });

    expect(deColectivo).toMatchObject({
      usuarioId: ana._id,
      tipoContextoId: await idDeTipoDeContexto("COLECTIVO"),
      rolId: await idDeRol("LIDER"),
      colectivoId: colectivo._id,
      colaboradorId: null,
    });
    expect(deColaborador).toMatchObject({
      usuarioId: ada._id,
      tipoContextoId: await idDeTipoDeContexto("COLABORADOR"),
      rolId: await idDeRol("COLABORADOR"),
      colectivoId: null,
      colaboradorId: perfil._id,
    });
    for (const contexto of [deColectivo, deColaborador]) {
      expect(contexto).not.toHaveProperty("tipo");
      expect(contexto).not.toHaveProperty("rol");
    }
    expect((await crudo(UsuarioModel, { _id: ana._id })).contextoActualId).toEqual(
      deColectivo._id,
    );
    expect((await crudo(UsuarioModel, { _id: ada._id })).contextoActualId).toEqual(
      deColaborador._id,
    );
  });

  test("los catalogos solo guardan su nombre y RolXPermiso conserva la relacion N:M", async () => {
    expect((await RolModel.find().lean()).map((r) => r.nombre).sort()).toEqual([
      "ADMIN",
      "COLABORADOR",
      "LIDER",
      "MIEMBRO",
    ]);
    expect((await TipoContextoModel.find().lean()).map((t) => t.nombre).sort()).toEqual([
      "ADMINISTRACION",
      "COLABORADOR",
      "COLECTIVO",
    ]);
    expect(await PermisoModel.countDocuments()).toBe(Object.values(PERMISO).length);

    const rol = await crudo(RolModel, { nombre: "LIDER" });
    expect(rol).not.toHaveProperty("permisos");
    expect(rol).not.toHaveProperty("tipoContexto");

    const pares = await RolXPermisoModel.collection.find().toArray();
    expect(pares).toHaveLength(ROLES.reduce((n, r) => n + r.permisos.length, 0));
    expect(pares.every((p) => esObjectId(p.rolId) && esObjectId(p.permisoId))).toBe(true);

    const permisosDeLider = await PermisoModel.find({
      _id: { $in: pares.filter((p) => p.rolId.equals(rol._id)).map((p) => p.permisoId) },
    }).lean();
    expect(permisosDeLider.map((p) => p.nombre).sort()).toEqual(
      [...ROLES.find((r) => r.nombre === "LIDER").permisos].sort(),
    );
  });

  test("la autorizacion se arma leyendo roles, permisos y rolesXPermisos de la base", async () => {
    const { roles } = await asegurarCatalogos(
      new MongoCatalogoRepository(),
      PROVEEDORES_DE_PRUEBA,
    );
    const desdeLaBase = new CatalogoDeRoles(roles);
    const desdeElCodigo = new CatalogoDeRoles();
    for (const { nombre } of ROLES) {
      expect(desdeLaBase.permisosDe(nombre).sort()).toEqual(
        desdeElCodigo.permisosDe(nombre).sort(),
      );
    }
  });

  test("el seed es idempotente y quita de rolesXPermisos lo que un rol ya no tiene", async () => {
    const repositorio = new MongoCatalogoRepository();
    const contar = async () => ({
      roles: await RolModel.countDocuments(),
      tipos: await TipoContextoModel.countDocuments(),
      permisos: await PermisoModel.countDocuments(),
      pares: await RolXPermisoModel.countDocuments(),
      proveedores: await ProveedorAutentificadorModel.countDocuments(),
    });
    const antes = await contar();
    const idsDeRoles = (await RolModel.find().lean()).map((r) => String(r._id)).sort();

    await asegurarCatalogos(repositorio, PROVEEDORES_DE_PRUEBA);
    expect(await contar()).toEqual(antes);
    expect((await RolModel.find().lean()).map((r) => String(r._id)).sort()).toEqual(
      idsDeRoles,
    );

    const colaborador = ROLES.find((r) => r.nombre === "COLABORADOR");
    await repositorio.asegurarPermisosDeRol("COLABORADOR", colaborador.permisos.slice(1));
    expect(await RolXPermisoModel.countDocuments()).toBe(antes.pares - 1);
  });

  test("un proveedor deshabilitado no se vuelve a habilitar al sembrar", async () => {
    await ProveedorAutentificadorModel.updateOne(
      { proveedor: "otro" },
      { $set: { activo: false } },
    );
    const { proveedoresActivos } = await asegurarCatalogos(
      new MongoCatalogoRepository(),
      PROVEEDORES_DE_PRUEBA,
    );
    expect(proveedoresActivos.sort()).toEqual(["a", "prueba"]);
  });

  describe("restricciones UNIQUE", () => {
    test("usuarios.identidadExternaId", async () => {
      const ana = await registrar("ana");
      const { identidadExternaId } = await crudo(UsuarioModel, { _id: ana._id });
      await expect(
        UsuarioModel.collection.insertOne({ identidadExternaId, contextoActualId: null }),
      ).rejects.toMatchObject(DUPLICADO);
    });

    test("identidadesExternas (proveedorId, identificadorExterno)", async () => {
      await registrar("ana");
      const identidad = await crudo(IdentidadExternaModel);
      await expect(
        IdentidadExternaModel.collection.insertOne({
          proveedorId: identidad.proveedorId,
          identificadorExterno: identidad.identificadorExterno,
        }),
      ).rejects.toMatchObject(DUPLICADO);

      const otra = await registrar("ana", "otro");
      expect(await IdentidadExternaModel.countDocuments()).toBe(2);
      expect(await UsuarioModel.countDocuments()).toBe(2);
      expect(otra.identidadExternaId).not.toEqual(identidad._id);
    });

    test("proveedoresAutentificadores.proveedor", async () => {
      await expect(
        ProveedorAutentificadorModel.collection.insertOne({
          proveedor: "prueba",
          nombre: "Repetido",
          mecanismo: "OIDC_JWT",
        }),
      ).rejects.toMatchObject(DUPLICADO);
    });

    test("rolesXPermisos (rolId, permisoId)", async () => {
      const par = await crudo(RolXPermisoModel);
      await expect(
        RolXPermisoModel.collection.insertOne({
          rolId: par.rolId,
          permisoId: par.permisoId,
        }),
      ).rejects.toMatchObject(DUPLICADO);
    });

    test("el indice de un lider activo por colectivo usa la referencia al rol LIDER", async () => {
      const indices = await ContextoUsuarioModel.collection.indexes();
      expect(indices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "lider_activo_por_colectivo",
            key: { colectivoId: 1 },
            unique: true,
            partialFilterExpression: { rolId: await idDeRol("LIDER"), activo: true },
          }),
        ]),
      );
    });
  });

  describe("referencias obligatorias y opcionales", () => {
    test.each([
      ["usuarios sin identidadExternaId", UsuarioModel, { contextoActualId: null }],
      [
        "usuarios con identidadExternaId que no es una referencia",
        UsuarioModel,
        { identidadExternaId: "logto|ana", contextoActualId: null },
      ],
      [
        "identidadesExternas sin proveedorId",
        IdentidadExternaModel,
        { identificadorExterno: "ana" },
      ],
      [
        "identidadesExternas con el proveedor como texto",
        IdentidadExternaModel,
        { proveedorId: "logto", identificadorExterno: "ana" },
      ],
      ["rolesXPermisos sin permisoId", RolXPermisoModel, { rolId: new ObjectId() }],
      [
        "rolesXPermisos con codigos en lugar de referencias",
        RolXPermisoModel,
        { rolId: "LIDER", permisoId: "PROYECTO_CREAR" },
      ],
    ])("la base rechaza %s", async (_caso, modelo, documento) => {
      await expect(modelo.collection.insertOne(documento)).rejects.toMatchObject(
        RECHAZADO_POR_EL_VALIDADOR,
      );
    });

    test("la base rechaza un contexto con el rol o el tipo como texto", async () => {
      const valido = await conReferencias({
        usuarioId: new ObjectId(),
        tipo: "COLECTIVO",
        rol: "LIDER",
        activo: true,
        colectivoId: new ObjectId(),
        colaboradorId: null,
      });
      const coleccion = ContextoUsuarioModel.collection;
      await expect(
        coleccion.insertOne({ ...valido, _id: new ObjectId(), rolId: "LIDER" }),
      ).rejects.toMatchObject(RECHAZADO_POR_EL_VALIDADOR);
      await expect(
        coleccion.insertOne({
          ...valido,
          _id: new ObjectId(),
          tipoContextoId: "COLECTIVO",
        }),
      ).rejects.toMatchObject(RECHAZADO_POR_EL_VALIDADOR);
      await expect(
        coleccion.insertOne({
          ...valido,
          _id: new ObjectId(),
          rolId: await idDeRol("COLABORADOR"),
        }),
      ).rejects.toMatchObject(RECHAZADO_POR_EL_VALIDADOR);
      await expect(coleccion.insertOne(valido)).resolves.toMatchObject({
        acknowledged: true,
      });
    });

    test("contextoActualId y la asociacion ajena admiten null", async () => {
      const ana = await registrar("ana");
      expect((await crudo(UsuarioModel, { _id: ana._id })).contextoActualId).toBeNull();
      await services.modalidadService.crearColectivo(ana, alta("A"));
      expect((await crudo(ContextoUsuarioModel)).colaboradorId).toBeNull();
    });
  });

  describe("integridad referencial desde la aplicacion", () => {
    test("no se crea un contexto para un usuario, colectivo o colaborador inexistente", async () => {
      const ana = await registrar("ana");
      const contextos = services.contextoService.contextoUsuarioRepository;

      await expect(
        contextos.crear({
          usuarioId: new ObjectId(),
          tipo: "COLECTIVO",
          rol: "LIDER",
          colectivoId: new ObjectId(),
        }),
      ).rejects.toThrow("no existe el usuario");
      await expect(
        contextos.crear({
          usuarioId: ana._id,
          tipo: "COLECTIVO",
          rol: "LIDER",
          colectivoId: new ObjectId(),
        }),
      ).rejects.toThrow("no existe el colectivo");
      await expect(
        contextos.crear({
          usuarioId: ana._id,
          tipo: "COLABORADOR",
          rol: "COLABORADOR",
          colaboradorId: new ObjectId(),
        }),
      ).rejects.toThrow("no existe el colaborador");
      await expect(
        contextos.crear({
          usuarioId: ana._id,
          tipo: "COLABORADOR",
          rol: "LIDER",
          colaboradorId: new ObjectId(),
        }),
      ).rejects.toThrow("El rol LIDER no corresponde a un contexto COLABORADOR");
      expect(await ContextoUsuarioModel.countDocuments()).toBe(0);
    });

    test("no se registra una identidad de un proveedor que no esta en el catalogo", async () => {
      await expect(registrar("ana", "desconocido")).rejects.toThrow(
        'El proveedor "desconocido" no esta en el catalogo',
      );
      expect(
        await services.registroService.usuarioDe({
          proveedor: "desconocido",
          sub: "ana",
        }),
      ).toBeNull();
      expect(await IdentidadExternaModel.countDocuments()).toBe(0);
      expect(await UsuarioModel.countDocuments()).toBe(0);
    });

    test("no se crea un usuario para una identidad externa inexistente", async () => {
      await expect(
        services.registroService.usuarioRepository.asegurarDeIdentidad(new ObjectId()),
      ).rejects.toThrow("no existe la identidad externa");
      expect(await UsuarioModel.countDocuments()).toBe(0);
    });

    test("el contexto actual solo puede ser un contexto activo del propio usuario", async () => {
      const ana = await registrar("ana");
      const beto = await registrar("beto");
      await services.modalidadService.crearColectivo(ana, alta("A"));
      const deAna = await crudo(ContextoUsuarioModel, { usuarioId: ana._id });
      const usuarios = services.registroService.usuarioRepository;

      await expect(usuarios.fijarContextoActual(beto._id, deAna._id)).rejects.toThrow(
        "el contexto actual debe ser un contexto activo del usuario",
      );
      await expect(usuarios.fijarContextoActual(ana._id, new ObjectId())).rejects.toThrow(
        "el contexto actual debe ser un contexto activo del usuario",
      );
      expect((await crudo(UsuarioModel, { _id: beto._id })).contextoActualId).toBeNull();
      expect((await crudo(UsuarioModel, { _id: ana._id })).contextoActualId).toEqual(
        deAna._id,
      );
    });
  });

  describe("registro y alta de modalidad sin duplicados", () => {
    test("registrar dos veces la misma identidad devuelve el mismo usuario", async () => {
      const primera = await services.registroService.registrar({
        proveedor: "prueba",
        sub: "ana",
      });
      const segunda = await services.registroService.registrar({
        proveedor: "prueba",
        sub: "ana",
      });
      expect(primera.creado).toBe(true);
      expect(segunda.creado).toBe(false);
      expect(segunda.usuario.id).toBe(primera.usuario.id);
      expect(await UsuarioModel.countDocuments()).toBe(1);
      expect(await IdentidadExternaModel.countDocuments()).toBe(1);
    });

    test("registros simultaneos de la misma identidad dejan un usuario y una identidad", async () => {
      const resultados = await Promise.all(
        Array.from({ length: 5 }, () =>
          services.registroService.registrar({ proveedor: "prueba", sub: "ana" }),
        ),
      );
      expect(new Set(resultados.map((r) => r.usuario.id)).size).toBe(1);
      expect(await UsuarioModel.countDocuments()).toBe(1);
      expect(await IdentidadExternaModel.countDocuments()).toBe(1);
    });

    test("reintentar el alta de colaboradora no crea un segundo contexto", async () => {
      const ada = await registrar("ada");
      await services.modalidadService.crearPerfilColaborador(ada, { cuentaGit: "ada" });
      await expect(
        services.modalidadService.crearPerfilColaborador(ada, { cuentaGit: "ada" }),
      ).rejects.toMatchObject({ codigo: "PERFIL_COLABORADOR_EXISTENTE" });
      expect(await ContextoUsuarioModel.countDocuments({ usuarioId: ada._id })).toBe(1);
    });
  });

  describe("bases con el modelo anterior", () => {
    test("una base nueva pasa la comprobacion", async () => {
      await registrar("ana");
      await expect(exigirModeloVigente()).resolves.toBeUndefined();
    });

    test.each([
      ["roles", { codigo: "LIDER", nombre: "Lider", permisos: ["PROYECTO_CREAR"] }],
      [
        "identidadesExternas",
        { proveedor: "logto", sub: "ana", usuarioId: new ObjectId() },
      ],
      ["contextosUsuario", { tipo: "COLECTIVO", rol: "LIDER" }],
      ["usuarios", { contextoActualId: null, nombre: "Ana" }],
    ])(
      "un documento anterior en %s detiene el arranque",
      async (coleccion, documento) => {
        const db = mongoose.connection.db;
        await db.command({ collMod: coleccion, validator: {} }).catch(() => {});
        await db.collection(coleccion).insertOne(documento);
        await expect(exigirModeloVigente()).rejects.toThrow(
          `La coleccion "${coleccion}" tiene documentos del modelo de seguridad anterior`,
        );
      },
    );

    test("preparar la base dos veces no falla ni duplica el indice de lider", async () => {
      const repositorio = new MongoCatalogoRepository();
      await asegurarValidadores(repositorio);
      await asegurarValidadores(repositorio);
      const indices = await ContextoUsuarioModel.collection.indexes();
      expect(indices.filter((i) => i.name === "lider_activo_por_colectivo")).toHaveLength(
        1,
      );
    });
  });
});
