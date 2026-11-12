import mongoose from "mongoose";
import { COLABORACION_ESTADO } from "../domain/enums/COLABORACION_ESTADO.js";

const INDICES_VIEJOS = [
  "proyectos._id_1",
  "proyectos.etiquetas_1",
  "proyectos.colaboraciones.colaborador_1",
];

export async function migrarProyectosYColaboraciones() {
  const db = mongoose.connection.db;
  const colectivos = db.collection("colectivos");
  const proyectos = db.collection("proyectos");
  const colaboraciones = db.collection("colaboraciones");
  const informe = { colectivos: 0, proyectos: 0, colaboraciones: 0 };

  const conProyectos = colectivos.find({ proyectos: { $exists: true } });
  for await (const colectivo of conProyectos) {
    for (const { colaboraciones: lista = [], ...proyecto } of colectivo.proyectos ?? []) {
      const migradas = lista.map((colaboracion) => ({
        ...colaboracion,
        estado: colaboracion.estado ?? COLABORACION_ESTADO.ACEPTADA,
        proyectoId: proyecto._id,
        colectivoId: colectivo._id,
      }));

      const { upsertedCount } = await proyectos.updateOne(
        { _id: proyecto._id },
        {
          $setOnInsert: {
            ...proyecto,
            perfiles: (proyecto.perfiles ?? []).map((perfil) => ({
              ...perfil,
              cupoCompleto: cupoCompleto(perfil, migradas),
            })),
            colectivoId: colectivo._id,
            datosDelColectivo: {
              nombre: colectivo.nombre,
              tipoColectivo: colectivo.tipoColectivo,
              ubicacion: colectivo.ubicacion ?? null,
            },
            __v: 0,
          },
        },
        { upsert: true },
      );
      informe.proyectos += upsertedCount;

      for (const colaboracion of migradas) {
        const resultado = await colaboraciones.updateOne(
          { _id: colaboracion._id },
          { $setOnInsert: colaboracion },
          { upsert: true },
        );
        informe.colaboraciones += resultado.upsertedCount;
      }
    }

    await colectivos.updateOne({ _id: colectivo._id }, { $unset: { proyectos: "" } });
    informe.colectivos += 1;
  }

  for (const indice of INDICES_VIEJOS) {
    await colectivos.dropIndex(indice).catch(() => null);
  }

  return informe;
}

function cupoCompleto(perfil, colaboraciones) {
  const limite = perfil.limiteColaboraciones;
  if (limite === null || limite === undefined) return false;
  const aceptadas = colaboraciones.filter(
    (c) =>
      c.estado === COLABORACION_ESTADO.ACEPTADA &&
      String(c.perfil) === String(perfil._id),
  ).length;
  return aceptadas >= limite;
}
