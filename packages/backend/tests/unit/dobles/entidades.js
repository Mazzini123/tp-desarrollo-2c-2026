import { Proyecto } from "../../../src/domain/Proyecto.js";
import { Perfil } from "../../../src/domain/Perfil.js";
import { Colaboracion } from "../../../src/domain/Colaboracion.js";
import { Colaborador } from "../../../src/domain/Colaborador.js";
import { Colectivo } from "../../../src/domain/Colectivo.js";
import { Habilidad } from "../../../src/domain/Habilidad.js";
import { PROYECTO_ESTADO } from "../../../src/domain/enums/PROYECTO_ESTADO.js";
import { COLABORACION_ESTADO } from "../../../src/domain/enums/COLABORACION_ESTADO.js";
import { MODO_ACEPTACION } from "../../../src/domain/enums/MODO_ACEPTACION.js";

let ultimoId = 0;
export const nuevoId = () => (++ultimoId).toString(16).padStart(24, "0");

export const habilidad = (codigo) =>
  Object.assign(new Habilidad(), { codigo, titulo: codigo, activo: true });

export function perfil(datos = {}) {
  return Object.assign(new Perfil(), {
    id: nuevoId(),
    titulo: null,
    descripcion: "Perfil",
    habilidadesRequeridas: [habilidad("node")],
    habilidadesOpcionales: [],
    busquedaAbierta: true,
    fechaCierreBusqueda: null,
    limiteColaboraciones: null,
    modoAceptacion: MODO_ACEPTACION.REVISION_MANUAL,
    ...datos,
  });
}

export function proyecto(datos = {}) {
  const id = datos.id ?? nuevoId();
  return Object.assign(new Proyecto(), {
    id,
    _id: id,
    colectivoId: nuevoId(),
    titulo: "Proyecto",
    estado: PROYECTO_ESTADO.ABIERTO,
    fechaCierre: null,
    porcentajeConcrecion: 0,
    perfiles: [perfil()],
    colaboraciones: [],
    logros: [],
    avances: [],
    ...datos,
  });
}

export function colaboracion(datos = {}) {
  const id = datos.id ?? nuevoId();
  return Object.assign(new Colaboracion(), {
    id,
    _id: id,
    estado: COLABORACION_ESTADO.PENDIENTE,
    esPublica: true,
    fecha: new Date(),
    fechaResolucion: null,
    fechaFin: null,
    ...datos,
  });
}

export function colaborador(datos = {}) {
  const id = datos.id ?? nuevoId();
  return Object.assign(new Colaborador(), {
    id,
    _id: id,
    cuentaGit: "ada",
    habilidades: [habilidad("node")],
    pronombres: [],
    mediosDeContacto: [],
    recibeMensajeriaInterna: true,
    fechaBaja: null,
    ...datos,
  });
}

export function colectivo(datos = {}) {
  const id = datos.id ?? nuevoId();
  return Object.assign(new Colectivo(), {
    id,
    _id: id,
    nombre: "Colectivo",
    tipoColectivo: "ONG",
    mediosDeContacto: [],
    redesSociales: [],
    etiquetas: [],
    fechaBaja: null,
    ...datos,
  });
}
