import mongoose from "mongoose";
import { aplicarFormatoJSON } from "../../models/formatoJSON.js";

const ObjectId = mongoose.Schema.Types.ObjectId;

const tipoContextoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
});
aplicarFormatoJSON(tipoContextoSchema, { campos: ["id", "nombre"] });

const rolSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
});
aplicarFormatoJSON(rolSchema, { campos: ["id", "nombre"] });

const permisoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  descripcion: { type: String, required: true },
});
aplicarFormatoJSON(permisoSchema, { campos: ["id", "nombre", "descripcion"] });

const rolXPermisoSchema = new mongoose.Schema({
  rolId: { type: ObjectId, ref: "Rol", required: true },
  permisoId: { type: ObjectId, ref: "Permiso", required: true },
});
aplicarFormatoJSON(rolXPermisoSchema, { campos: ["id", "rolId", "permisoId"] });
rolXPermisoSchema.index({ rolId: 1, permisoId: 1 }, { unique: true });
rolXPermisoSchema.index({ permisoId: 1 });

const proveedorAutentificadorSchema = new mongoose.Schema({
  proveedor: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  mecanismo: { type: String, required: true },
  activo: { type: Boolean, default: true },
});
aplicarFormatoJSON(proveedorAutentificadorSchema, {
  campos: ["id", "proveedor", "nombre", "mecanismo", "activo"],
});

export const TipoContextoModel = mongoose.model(
  "TipoContexto",
  tipoContextoSchema,
  "tiposContexto",
);
export const RolModel = mongoose.model("Rol", rolSchema, "roles");
export const PermisoModel = mongoose.model("Permiso", permisoSchema, "permisos");
export const RolXPermisoModel = mongoose.model(
  "RolXPermiso",
  rolXPermisoSchema,
  "rolesXPermisos",
);
export const ProveedorAutentificadorModel = mongoose.model(
  "ProveedorAutentificador",
  proveedorAutentificadorSchema,
  "proveedoresAutentificadores",
);
