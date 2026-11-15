import mongoose from "mongoose";
import { ColaboradorModel } from "../../src/models/ColaboradorModel.js";
import { migrarProyectosYColaboraciones } from "../../src/migraciones/002-proyectosYColaboracionesAColecciones.js";
import { migrarEnviosConEstado } from "../../src/migraciones/003-enviosConEstado.js";
import { armarServicesConMongo, usarBaseDeTest } from "./baseDeTest.js";

/**
 * Migraciones 002 y 003: los datos guardados con el modelo anterior (proyectos y
 * colaboraciones adentro del colectivo) pasan a sus colecciones y la API los
 * sigue sirviendo con los mismos ids.
 */
usarBaseDeTest();

const { ObjectId } = mongoose.Types;

let s;
beforeEach(async () => {
  s = await armarServicesConMongo();
});

async function guardarColectivoViejo() {
  const ids = {
    colectivo: new ObjectId(),
    proyecto: new ObjectId(),
    perfil: new ObjectId(),
    colaborador: new ObjectId(),
    aceptada: new ObjectId(),
    vieja: new ObjectId(),
  };
  await ColaboradorModel.collection.insertOne({
    _id: ids.colaborador,
    cuentaGit: "ada",
    habilidades: [],
    mediosDeContacto: [],
    recibeMensajeriaInterna: true,
  });
  await mongoose.connection.db.collection("colectivos").insertOne({
    _id: ids.colectivo,
    nombre: "Huerta",
    descripcion: "d",
    tipoColectivo: "ASAMBLEA",
    ubicacion: { tipoUbicacion: "PROVINCIA", nombre: "Salta" },
    fechaAlta: new Date("2026-01-01"),
    fechaBaja: null,
    __v: 3,
    proyectos: [
      {
        _id: ids.proyecto,
        titulo: "Mapa",
        descripcion: "d",
        estado: "ABIERTO",
        perfiles: [
          {
            _id: ids.perfil,
            descripcion: "Perfil",
            compromiso: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
            modalidadColaboracion: "GRATUITA",
            habilidadesRequeridas: [
              { codigo: "desarrollo_node", titulo: "Desarrollo Node" },
            ],
            habilidadesOpcionales: [],
            limiteColaboraciones: 2,
            modoAceptacion: "REVISION_MANUAL",
          },
        ],
        colaboraciones: [
          {
            _id: ids.aceptada,
            colaborador: ids.colaborador,
            perfil: ids.perfil,
            esPublica: true,
            estado: "ACEPTADA",
          },
          // De la primera entrega: sin estado, era una colaboracion aceptada.
          {
            _id: ids.vieja,
            colaborador: ids.colaborador,
            perfil: ids.perfil,
            esPublica: true,
          },
        ],
        logros: [],
        avances: [],
        etiquetas: [],
      },
    ],
  });
  return ids;
}

test("pasa proyectos y colaboraciones a sus colecciones, con los mismos ids", async () => {
  const ids = await guardarColectivoViejo();

  const informe = await migrarProyectosYColaboraciones();
  expect(informe).toEqual({ colectivos: 1, proyectos: 1, colaboraciones: 2 });

  const colectivo = await mongoose.connection.db
    .collection("colectivos")
    .findOne({ _id: ids.colectivo });
  expect(colectivo).not.toHaveProperty("proyectos");

  const proyecto = await s.proyectoService.buscarPorId(String(ids.proyecto));
  expect(proyecto.colectivo).toEqual({
    id: String(ids.colectivo),
    nombre: "Huerta",
    ubicacion: expect.objectContaining({ tipoUbicacion: "PROVINCIA", nombre: "Salta" }),
  });
  expect(proyecto.colaboraciones.map((c) => [c.id, c.estado])).toEqual([
    [String(ids.aceptada), "ACEPTADA"],
    [String(ids.vieja), "ACEPTADA"],
  ]);
  expect(proyecto.colaboraciones[0].colaborador.cuentaGit).toBe("ada");
  // Dos aceptadas con limite 2: el cupo quedo completo.
  expect(proyecto.perfiles[0].cupoCompleto).toBe(true);

  // Y se puede seguir operando con lo migrado.
  proyecto.titulo = "Mapa colaborativo";
  await s.proyectoService.proyectoRepository.guardar(proyecto);
  expect((await s.proyectoService.buscarPorId(String(ids.proyecto))).titulo).toBe(
    "Mapa colaborativo",
  );
});

test("correrla dos veces no duplica nada", async () => {
  await guardarColectivoViejo();

  await migrarProyectosYColaboraciones();
  const segunda = await migrarProyectosYColaboraciones();

  expect(segunda).toEqual({ colectivos: 0, proyectos: 0, colaboraciones: 0 });
  expect(await mongoose.connection.db.collection("proyectos").countDocuments()).toBe(1);
  expect(await mongoose.connection.db.collection("colaboraciones").countDocuments()).toBe(
    2,
  );
});

test("migracion 003: los envios viejos quedan con estado y no se vuelven a mandar", async () => {
  const ada = await s.colaboradorService.crear({ cuentaGit: "ada" });
  const { insertedId } = await mongoose.connection.db
    .collection("notificaciones")
    .insertOne({
      destinatarioId: new ObjectId(ada.id),
      tipo: "INVITACION",
      asunto: "Hola",
      contenido: "Hola",
      referencias: {},
      fecha: new Date("2026-05-01"),
      esLeida: false,
      envios: [
        { canal: "EMAIL", exito: true },
        { canal: "SMS", exito: false },
      ],
    });

  expect(await migrarEnviosConEstado()).toEqual({ notificaciones: 1 });
  expect(await migrarEnviosConEstado()).toEqual({ notificaciones: 0 });

  const [vieja] = (await s.notificacionService.listar(ada.id)).items;
  expect(vieja.id).toBe(String(insertedId));
  expect(vieja.toJSON().envios).toEqual([
    { canal: "EMAIL", estado: "ENVIADO", exito: true, intentos: 1 },
    { canal: "SMS", estado: "FALLIDO", exito: false, intentos: 1 },
  ]);
  expect(await s.notificacionService.procesarEnviosPendientes()).toEqual({
    enviados: 0,
    reintentos: 0,
    fallidos: 0,
  });
  // Y se puede seguir usando (el esquema la valida al guardarla).
  await s.notificacionService.marcarComoLeida(ada.id, vieja.id);
});
