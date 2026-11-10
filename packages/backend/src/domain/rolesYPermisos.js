import { PERMISO } from "./enums/PERMISO.js";
import { ROL } from "./enums/ROL.js";
import { TIPO_CONTEXTO } from "./enums/TIPO_CONTEXTO.js";

export const TIPOS_DE_CONTEXTO = [
  { codigo: TIPO_CONTEXTO.COLABORADOR, nombre: "Colaborador" },
  { codigo: TIPO_CONTEXTO.COLECTIVO, nombre: "Colectivo" },
];

export const DESCRIPCION_DE_PERMISOS = {
  [PERMISO.COLECTIVO_EDITAR]: "Editar los datos del colectivo",
  [PERMISO.COLECTIVO_CONTACTO_GESTIONAR]:
    "Ver y editar los medios de contacto del colectivo",
  [PERMISO.COLECTIVO_ESTADISTICAS_VER]: "Ver las estadisticas del colectivo",
  [PERMISO.COLECTIVO_ELIMINAR]: "Dar de baja el colectivo",
  [PERMISO.COLECTIVO_MIEMBROS_VER]: "Ver los miembros del colectivo",
  [PERMISO.PROYECTO_CREAR]: "Crear proyectos",
  [PERMISO.PROYECTO_EDITAR]: "Editar proyectos, perfiles, logros y avances",
  [PERMISO.PROYECTO_FINALIZAR]: "Finalizar proyectos",
  [PERMISO.RECLUTAMIENTO_GESTIONAR]: "Buscar e invitar colaboradoras",
  [PERMISO.POSTULACION_RESOLVER]: "Aceptar o rechazar postulaciones",
  [PERMISO.CONTACTO_COLABORADORA_VER]: "Ver el contacto de una colaboradora aceptada",
  [PERMISO.COLABORACION_DESVINCULAR]: "Desvincular una colaboracion",
  [PERMISO.COLABORACION_FINALIZAR]: "Finalizar una colaboracion",
  [PERMISO.COLABORACION_VALORAR]: "Valorar una colaboracion",
  [PERMISO.COLABORADOR_PERFIL_EDITAR]: "Editar el perfil de colaboradora",
  [PERMISO.COLABORADOR_BAJA]: "Dar de baja el perfil de colaboradora",
  [PERMISO.PROYECTOS_POTENCIALES_VER]: "Ver proyectos que encajan con las habilidades",
  [PERMISO.NOTIFICACIONES_VER]: "Leer la bandeja de mensajes",
  [PERMISO.POSTULACION_CREAR]: "Postularse a un perfil",
  [PERMISO.POSTULACION_RETIRAR]: "Retirar una postulacion",
  [PERMISO.MEMBRESIA_SOLICITUD_RESOLVER]:
    "Ver, aceptar y rechazar solicitudes de ingreso",
  [PERMISO.MIEMBRO_ELIMINAR]: "Quitar miembros del colectivo",
  [PERMISO.LIDER_ASIGNAR]: "Pasarle el liderazgo a otro miembro",
};

const PERMISOS_DE_COLABORADOR = [
  PERMISO.COLABORADOR_PERFIL_EDITAR,
  PERMISO.COLABORADOR_BAJA,
  PERMISO.PROYECTOS_POTENCIALES_VER,
  PERMISO.NOTIFICACIONES_VER,
  PERMISO.POSTULACION_CREAR,
  PERMISO.POSTULACION_RETIRAR,
  PERMISO.COLABORACION_DESVINCULAR,
  PERMISO.COLABORACION_FINALIZAR,
  PERMISO.COLABORACION_VALORAR,
];

const PERMISOS_DE_MIEMBRO = [
  PERMISO.COLECTIVO_ESTADISTICAS_VER,
  PERMISO.COLECTIVO_MIEMBROS_VER,
  PERMISO.PROYECTO_CREAR,
  PERMISO.PROYECTO_EDITAR,
  PERMISO.PROYECTO_FINALIZAR,
  PERMISO.RECLUTAMIENTO_GESTIONAR,
  PERMISO.POSTULACION_RESOLVER,
  PERMISO.CONTACTO_COLABORADORA_VER,
  PERMISO.COLABORACION_DESVINCULAR,
  PERMISO.COLABORACION_FINALIZAR,
  PERMISO.COLABORACION_VALORAR,
];

const PERMISOS_PROPIOS_DE_LIDER = [
  PERMISO.COLECTIVO_EDITAR,
  PERMISO.COLECTIVO_CONTACTO_GESTIONAR,
  PERMISO.COLECTIVO_ELIMINAR,
  PERMISO.MEMBRESIA_SOLICITUD_RESOLVER,
  PERMISO.MIEMBRO_ELIMINAR,
  PERMISO.LIDER_ASIGNAR,
];

export const ROLES = [
  {
    codigo: ROL.COLABORADOR,
    nombre: "Colaboradora",
    tipoContexto: TIPO_CONTEXTO.COLABORADOR,
    permisos: PERMISOS_DE_COLABORADOR,
  },
  {
    codigo: ROL.MIEMBRO,
    nombre: "Miembro",
    tipoContexto: TIPO_CONTEXTO.COLECTIVO,
    permisos: PERMISOS_DE_MIEMBRO,
  },
  {
    codigo: ROL.LIDER,
    nombre: "Lider",
    tipoContexto: TIPO_CONTEXTO.COLECTIVO,
    permisos: [...PERMISOS_DE_MIEMBRO, ...PERMISOS_PROPIOS_DE_LIDER],
  },
];
