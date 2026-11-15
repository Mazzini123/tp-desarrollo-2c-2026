import mongoose from "mongoose";
import { ContextoUsuarioModel, INDICE_DE_LIDER_ACTIVO } from "./ContextoUsuarioModel.js";
import { IdentidadExternaModel } from "./IdentidadExternaModel.js";
import { UsuarioModel } from "./UsuarioModel.js";
import { RolXPermisoModel } from "./catalogos.js";
import { ROL } from "../autorizacion/enums/ROL.js";
import { TIPO_CONTEXTO } from "../autorizacion/enums/TIPO_CONTEXTO.js";
import { ROLES_POR_TIPO } from "../autorizacion/rolesYPermisos.js";

const YA_EXISTE = 48;
const INDICE_CON_OTRAS_OPCIONES = [85, 86];
const OBJECT_ID = { bsonType: "objectId" };

const VALIDADORES_FIJOS = [
  {
    modelo: UsuarioModel,
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["identidadExternaId", "contextoActualId"],
        properties: {
          identidadExternaId: OBJECT_ID,
          contextoActualId: { bsonType: ["objectId", "null"] },
        },
      },
    },
  },
  {
    modelo: IdentidadExternaModel,
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["proveedorId", "identificadorExterno"],
        properties: {
          proveedorId: OBJECT_ID,
          identificadorExterno: { bsonType: "string", minLength: 1 },
        },
      },
    },
  },
  {
    modelo: RolXPermisoModel,
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["rolId", "permisoId"],
        properties: { rolId: OBJECT_ID, permisoId: OBJECT_ID },
      },
    },
  },
];

export async function validadorDeContextos(catalogoRepository) {
  const variante = async (tipo, propia, ajena) => ({
    properties: {
      tipoContextoId: { enum: [await catalogoRepository.idDeTipoDeContexto(tipo)] },
      rolId: {
        enum: await Promise.all(
          ROLES_POR_TIPO[tipo].map((rol) => catalogoRepository.idDeRol(rol)),
        ),
      },
      [propia]: OBJECT_ID,
      [ajena]: { bsonType: "null" },
    },
  });

  const sinEntidad = async () => ({
    properties: {
      tipoContextoId: {
        enum: [await catalogoRepository.idDeTipoDeContexto(TIPO_CONTEXTO.ADMINISTRACION)],
      },
      rolId: {
        enum: await Promise.all(
          ROLES_POR_TIPO[TIPO_CONTEXTO.ADMINISTRACION].map((rol) =>
            catalogoRepository.idDeRol(rol),
          ),
        ),
      },
      colaboradorId: { bsonType: "null" },
      colectivoId: { bsonType: "null" },
    },
  });

  return {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "usuarioId",
        "tipoContextoId",
        "rolId",
        "activo",
        "colaboradorId",
        "colectivoId",
      ],
      properties: {
        usuarioId: OBJECT_ID,
        tipoContextoId: OBJECT_ID,
        rolId: OBJECT_ID,
        activo: { bsonType: "bool" },
      },
      oneOf: [
        await variante(TIPO_CONTEXTO.COLABORADOR, "colaboradorId", "colectivoId"),
        await variante(TIPO_CONTEXTO.COLECTIVO, "colectivoId", "colaboradorId"),
        await sinEntidad(),
      ],
    },
  };
}

async function aplicarValidador(db, nombre, validator) {
  const opciones = { validator, validationLevel: "strict", validationAction: "error" };
  try {
    await db.createCollection(nombre, opciones);
  } catch (error) {
    if (error.code !== YA_EXISTE) throw error;
    await db.command({ collMod: nombre, ...opciones });
  }
}

async function asegurarIndiceDeLiderActivo(catalogoRepository) {
  const coleccion = ContextoUsuarioModel.collection;
  const crear = async () =>
    coleccion.createIndex(
      { colectivoId: 1 },
      {
        name: INDICE_DE_LIDER_ACTIVO,
        unique: true,
        partialFilterExpression: {
          rolId: await catalogoRepository.idDeRol(ROL.LIDER),
          activo: true,
        },
      },
    );
  try {
    await crear();
  } catch (error) {
    if (!INDICE_CON_OTRAS_OPCIONES.includes(error.code)) throw error;
    await coleccion.dropIndex(INDICE_DE_LIDER_ACTIVO);
    await crear();
  }
}

export async function asegurarValidadores(
  catalogoRepository,
  db = mongoose.connection.db,
) {
  for (const { modelo, validator } of VALIDADORES_FIJOS) {
    await aplicarValidador(db, modelo.collection.collectionName, validator);
  }
  await aplicarValidador(
    db,
    ContextoUsuarioModel.collection.collectionName,
    await validadorDeContextos(catalogoRepository),
  );
  await asegurarIndiceDeLiderActivo(catalogoRepository);
}

const RASTROS_DEL_MODELO_ANTERIOR = [
  { coleccion: "roles", filtro: { codigo: { $exists: true } } },
  { coleccion: "identidadesExternas", filtro: { sub: { $exists: true } } },
  { coleccion: "contextosUsuario", filtro: { tipo: { $exists: true } } },
  { coleccion: "usuarios", filtro: { identidadExternaId: { $exists: false } } },
];

export async function exigirModeloVigente(db = mongoose.connection.db) {
  for (const { coleccion, filtro } of RASTROS_DEL_MODELO_ANTERIOR) {
    if (await db.collection(coleccion).findOne(filtro, { projection: { _id: 1 } })) {
      throw new Error(
        `La coleccion "${coleccion}" tiene documentos del modelo de seguridad anterior. ` +
          "El modelo actual no migra esos datos: recrea la base " +
          "(docker compose down -v && docker compose up -d) y volve a iniciar la API.",
      );
    }
  }
}
