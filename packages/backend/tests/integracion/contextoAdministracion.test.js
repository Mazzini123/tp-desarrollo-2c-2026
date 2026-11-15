import mongoose from "mongoose";
import { usarBaseDeTest, armarServicesConMongo } from "./baseDeTest.js";
import { conReferencias } from "../soporte/contextos.js";
import { ContextoUsuarioModel } from "../../src/security/persistencia/ContextoUsuarioModel.js";

usarBaseDeTest();

const ObjectId = () => new mongoose.Types.ObjectId();
const contextoAdmin = (extra = {}) =>
  conReferencias({
    usuarioId: ObjectId(),
    tipo: "ADMINISTRACION",
    rol: "ADMIN",
    activo: true,
    colectivoId: null,
    colaboradorId: null,
    ...extra,
  });

describe("Integracion · contexto de administracion", () => {
  beforeEach(async () => {
    await armarServicesConMongo();
  });

  test("el validador de la base acepta un contexto de administracion sin colectivo ni colaboradora", async () => {
    await expect(
      ContextoUsuarioModel.collection.insertOne(await contextoAdmin()),
    ).resolves.toMatchObject({ acknowledged: true });
  });

  test.each([["colectivoId"], ["colaboradorId"]])(
    "el validador rechaza un contexto de administracion con %s",
    async (campo) => {
      await expect(
        ContextoUsuarioModel.collection.insertOne(
          await contextoAdmin({ [campo]: ObjectId() }),
        ),
      ).rejects.toMatchObject({ code: 121 });
    },
  );

  test("el validador rechaza el rol ADMIN en un contexto de colectivo", async () => {
    await expect(
      ContextoUsuarioModel.collection.insertOne(
        await conReferencias({
          usuarioId: ObjectId(),
          tipo: "COLECTIVO",
          rol: "ADMIN",
          activo: true,
          colectivoId: ObjectId(),
          colaboradorId: null,
        }),
      ),
    ).rejects.toMatchObject({ code: 121 });
  });

  test("el modelo crea el contexto de administracion y un indice impide dos activos por usuario", async () => {
    const usuarioId = ObjectId();
    await ContextoUsuarioModel.create(await contextoAdmin({ usuarioId }));
    await expect(
      ContextoUsuarioModel.create(await contextoAdmin({ usuarioId })),
    ).rejects.toMatchObject({ code: 11000 });
  });

  test("un contexto de administracion dado de baja permite crear otro", async () => {
    const usuarioId = ObjectId();
    await ContextoUsuarioModel.create(await contextoAdmin({ usuarioId, activo: false }));
    await expect(
      ContextoUsuarioModel.create(await contextoAdmin({ usuarioId })),
    ).resolves.toBeDefined();
  });

  test("los contextos de administracion de usuarios distintos no chocan entre si", async () => {
    await ContextoUsuarioModel.create(await contextoAdmin());
    await expect(
      ContextoUsuarioModel.create(await contextoAdmin()),
    ).resolves.toBeDefined();
  });
});
