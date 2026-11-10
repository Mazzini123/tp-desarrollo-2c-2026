import mongoose from "mongoose";
import { migrarCuentasAContextos } from "./001-cuentasAContextos.js";
import { migrarProyectosYColaboraciones } from "./002-proyectosYColaboracionesAColecciones.js";
import { migrarEnviosConEstado } from "./003-enviosConEstado.js";

export const MIGRACIONES = [
  { id: "001-cuentas-a-contextos", ejecutar: migrarCuentasAContextos },
  { id: "002-proyectos-y-colaboraciones", ejecutar: migrarProyectosYColaboraciones },
  { id: "003-envios-con-estado", ejecutar: migrarEnviosConEstado },
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
