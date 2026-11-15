import { migrarPersonasSinDuplicados } from "./005-personasSinDuplicados.js";
import mongoose from "mongoose";
import { migrarProyectosYColaboraciones } from "./002-proyectosYColaboracionesAColecciones.js";
import { migrarEnviosConEstado } from "./003-enviosConEstado.js";
import { migrarIndiceDeColaboradorActivo } from "./004-indiceDeColaboradorActivo.js";
import { registro } from "../config/registro.js";

export const MIGRACIONES = [
  { id: "002-proyectos-y-colaboraciones", ejecutar: migrarProyectosYColaboraciones },
  { id: "003-envios-con-estado", ejecutar: migrarEnviosConEstado },
  { id: "004-indice-colaborador-activo", ejecutar: migrarIndiceDeColaboradorActivo },
  { id: "005-personas-sin-duplicados", ejecutar: migrarPersonasSinDuplicados },
];

export async function ejecutarMigraciones(migraciones = MIGRACIONES) {
  const aplicadas = mongoose.connection.collection("migraciones");
  for (const migracion of migraciones) {
    if (await aplicadas.findOne({ _id: migracion.id })) continue;
    const informe = await migracion.ejecutar();
    await aplicadas.updateOne(
      { _id: migracion.id },
      { $setOnInsert: { fecha: new Date(), informe } },
      { upsert: true },
    );
    registro.info("migracion_aplicada", { migracion: migracion.id, informe });
  }
}
