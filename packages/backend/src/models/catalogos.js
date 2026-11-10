import mongoose from "mongoose";
import { aplicarFormatoJSON } from "./formatoJSON.js";

const rolSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  tipoContexto: { type: String, required: true },
  permisos: { type: [String], default: [] },
});
aplicarFormatoJSON(rolSchema, {
  campos: ["id", "codigo", "nombre", "tipoContexto", "permisos"],
});

const permisoSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  descripcion: { type: String, required: true },
});
aplicarFormatoJSON(permisoSchema, { campos: ["id", "codigo", "descripcion"] });

const tipoContextoSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
});
aplicarFormatoJSON(tipoContextoSchema, { campos: ["id", "codigo", "nombre"] });

const proveedorAutentificadorSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  mecanismo: { type: String, required: true },
  activo: { type: Boolean, default: true },
});
aplicarFormatoJSON(proveedorAutentificadorSchema, {
  campos: ["id", "codigo", "nombre", "mecanismo", "activo"],
});

export const RolModel = mongoose.model("Rol", rolSchema, "roles");
export const PermisoModel = mongoose.model("Permiso", permisoSchema, "permisos");
export const TipoContextoModel = mongoose.model(
  "TipoContexto",
  tipoContextoSchema,
  "tiposContexto",
);
export const ProveedorAutentificadorModel = mongoose.model(
  "ProveedorAutentificador",
  proveedorAutentificadorSchema,
  "proveedoresAutentificadores",
);
