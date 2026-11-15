import "dotenv/config";
import mongoose from "mongoose";
import { conectarBaseDeDatos } from "../src/config/db.js";
import { componerApp } from "../src/composicion.js";
import { esIdValido } from "../src/repositories/objectIds.js";

const USO = "Uso: npm run admin:otorgar -- <usuarioId | proveedor:sub>";

async function resolverUsuarioId(cuenta, { registroService }) {
  if (esIdValido(cuenta)) return cuenta;
  const separador = cuenta.indexOf(":");
  if (separador < 1) return null;
  const usuario = await registroService.usuarioDe({
    proveedor: cuenta.slice(0, separador),
    sub: cuenta.slice(separador + 1),
  });
  return usuario ? String(usuario._id) : null;
}

const [cuenta] = process.argv.slice(2);
if (!cuenta) {
  console.error(USO);
  process.exit(1);
}

try {
  await conectarBaseDeDatos();
  const { services } = componerApp();
  const usuarioId = await resolverUsuarioId(cuenta, services);
  if (!usuarioId) {
    console.error(`No existe una cuenta registrada para "${cuenta}". ${USO}`);
    process.exitCode = 1;
  } else {
    const { creado } = await services.administradorService.otorgar({ usuarioId });
    console.log(
      creado
        ? `Se otorgo el rol de administracion a ${usuarioId}.`
        : `${usuarioId} ya era administradora: sin cambios.`,
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
