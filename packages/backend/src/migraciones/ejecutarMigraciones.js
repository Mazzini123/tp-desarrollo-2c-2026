import mongoose from "mongoose";
import { migrarProyectosYColaboraciones } from "./002-proyectosYColaboracionesAColecciones.js";
import { migrarEnviosConEstado } from "./003-enviosConEstado.js";
import { migrarIndiceDeColaboradorActivo } from "./004-indiceDeColaboradorActivo.js";

export const MIGRACIONES = [
  { id: "002-proyectos-y-colaboraciones", ejecutar: migrarProyectosYColaboraciones },
  { id: "003-envios-con-estado", ejecutar: migrarEnviosConEstado },
  { id: "004-indice-colaborador-activo", ejecutar: migrarIndiceDeColaboradorActivo },
];

export async function ejecutarMigraciones(migraciones = MIGRACIONES) {
  const aplicadas = mongoose.connection.collection("migraciones");
  for (const migracion of migraciones) {
    if (await aplicadas.findOne({ _id: migracion.id })) continue;
    const informe = await migracion.ejecutar();
    await aplicadas.insertOne({ _id: migracion.id, fecha: new Date(), informe });
    console.log(`Migracion ${migracion.id} aplicada:`, JSON.stringify(informe));
  }
}
