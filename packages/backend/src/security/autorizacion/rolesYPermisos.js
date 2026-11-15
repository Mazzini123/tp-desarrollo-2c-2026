import { PERMISO } from "./enums/PERMISO.js";
import { ROL } from "./enums/ROL.js";
import { TIPO_CONTEXTO } from "./enums/TIPO_CONTEXTO.js";

export const TIPOS_DE_CONTEXTO = [
  { nombre: TIPO_CONTEXTO.COLABORADOR },
  { nombre: TIPO_CONTEXTO.COLECTIVO },
  { nombre: TIPO_CONTEXTO.ADMINISTRACION },
];

export const DESCRIPCION_DE_PERMISOS = {
  [PERMISO.COLECTIVO_EDITAR]: "Editar los datos del colectivo",
  [PERMISO.COLECTIVO_CONTACTO_GESTIONAR]:
    "Ver y editar los medios de contacto del colectivo",
  [PERMISO.COLECTIVO_ESTADISTICAS_VER]: "Ver las estadisticas del colectivo",
  [PERMISO.COLECTIVO_ELIMINAR]: "Dar de baja el colectivo",
  [PERMISO.COLECTIVO_MIEMBROS_VER]:
    "Ver los miembros y las solicitudes de ingreso del colectivo",
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
  [PERMISO.MEMBRESIA_SOLICITUD_RESOLVER]: "Aceptar o rechazar solicitudes de ingreso",
  [PERMISO.MIEMBRO_ELIMINAR]: "Quitar miembros del colectivo",
  [PERMISO.LIDER_ASIGNAR]: "Pasarle el liderazgo a otro miembro",
  [PERMISO.PROYECTO_DESTACAR]: "Destacar proyectos en la portada",
  [PERMISO.REVISION_VER]: "Ver las revisiones manuales de proyectos",
  [PERMISO.REVISION_RESOLVER]: "Resolver las revisiones manuales de proyectos",
  [PERMISO.AUDITORIA_VER]: "Ver el registro de acciones administrativas",
  [PERMISO.ADMIN_GESTIONAR]: "Otorgar el rol de administracion de la plataforma",
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

const PERMISOS_DE_ADMIN = [
  PERMISO.PROYECTO_DESTACAR,
  PERMISO.REVISION_VER,
  PERMISO.REVISION_RESOLVER,
  PERMISO.AUDITORIA_VER,
  PERMISO.ADMIN_GESTIONAR,
];

export const PERMISOS = Object.values(PERMISO).map((nombre) => ({
  nombre,
  descripcion: DESCRIPCION_DE_PERMISOS[nombre],
}));

export const ROLES = [
  { nombre: ROL.COLABORADOR, permisos: PERMISOS_DE_COLABORADOR },
  { nombre: ROL.MIEMBRO, permisos: PERMISOS_DE_MIEMBRO },
  {
    nombre: ROL.LIDER,
    permisos: [...PERMISOS_DE_MIEMBRO, ...PERMISOS_PROPIOS_DE_LIDER],
  },
  { nombre: ROL.ADMIN, permisos: PERMISOS_DE_ADMIN },
];

export const ROLES_POR_TIPO = Object.freeze({
  [TIPO_CONTEXTO.COLABORADOR]: [ROL.COLABORADOR],
  [TIPO_CONTEXTO.COLECTIVO]: [ROL.MIEMBRO, ROL.LIDER],
  [TIPO_CONTEXTO.ADMINISTRACION]: [ROL.ADMIN],
});

export function problemaDeConsistencia({ tipo, rol, colectivoId, colaboradorId }) {
  if (!ROLES_POR_TIPO[tipo]?.includes(rol)) {
    return `El rol ${rol} no corresponde a un contexto ${tipo}`;
  }
  if (tipo === TIPO_CONTEXTO.COLABORADOR && (!colaboradorId || colectivoId)) {
    return "Un contexto COLABORADOR tiene colaborador y no tiene colectivo";
  }
  if (tipo === TIPO_CONTEXTO.COLECTIVO && (!colectivoId || colaboradorId)) {
    return "Un contexto COLECTIVO tiene colectivo y no tiene colaborador";
  }
  if (tipo === TIPO_CONTEXTO.ADMINISTRACION && (colectivoId || colaboradorId)) {
    return "Un contexto ADMINISTRACION no tiene colectivo ni colaborador";
  }
  return null;
}
