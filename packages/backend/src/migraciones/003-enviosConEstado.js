import mongoose from "mongoose";
import { ESTADO_ENVIO } from "../domain/enums/ESTADO_ENVIO.js";

export async function migrarEnviosConEstado() {
  const notificaciones = mongoose.connection.db.collection("notificaciones");
  const informe = { notificaciones: 0 };

  const viejas = notificaciones.find({ "envios.exito": { $exists: true } });
  for await (const notificacion of viejas) {
    const envios = notificacion.envios.map((envio) =>
      envio.estado
        ? envio
        : {
            _id: new mongoose.Types.ObjectId(),
            canal: envio.canal,
            destino: "(sin registrar)",
            estado: envio.exito ? ESTADO_ENVIO.ENVIADO : ESTADO_ENVIO.FALLIDO,
            intentos: 1,
            proximoIntento: notificacion.fecha ?? null,
            enProcesoHasta: null,
            ultimoError: null,
            fechaEnvio: envio.exito ? (notificacion.fecha ?? null) : null,
          },
    );
    await notificaciones.updateOne({ _id: notificacion._id }, { $set: { envios } });
    informe.notificaciones += 1;
  }

  return informe;
}
