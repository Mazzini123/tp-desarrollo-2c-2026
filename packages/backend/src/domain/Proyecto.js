import {
  ESTADOS_EDITABLES,
  ESTADOS_PUBLICADOS,
  PROYECTO_ESTADO,
} from "./enums/PROYECTO_ESTADO.js";

export class Proyecto {
  estaAbierto() {
    return this.estado === PROYECTO_ESTADO.ABIERTO;
  }

  estaPublicado() {
    return ESTADOS_PUBLICADOS.includes(this.estado);
  }

  esBorrador() {
    return this.estado === PROYECTO_ESTADO.BORRADOR;
  }

  estaEnRevision() {
    return this.estado === PROYECTO_ESTADO.EN_REVISION;
  }

  esEditable() {
    return ESTADOS_EDITABLES.includes(this.estado);
  }

  pedirPublicacion(revisionId, fecha = new Date()) {
    this.estado = PROYECTO_ESTADO.EN_REVISION;
    this.publicacion = {
      solicitadaEn: fecha,
      revisionId,
      rechazo: null,
      aprobadaEn: null,
    };
  }

  aprobarPublicacion(fecha = new Date()) {
    this.estado = PROYECTO_ESTADO.ABIERTO;
    this.publicacion = { ...datosDePublicacion(this), rechazo: null, aprobadaEn: fecha };
  }

  rechazarPublicacion(nota, fecha = new Date()) {
    this.estado = PROYECTO_ESTADO.BORRADOR;
    this.publicacion = { ...datosDePublicacion(this), rechazo: { nota, fecha } };
  }

  estaDadoDeBaja() {
    return this.estado === PROYECTO_ESTADO.DADO_DE_BAJA;
  }

  darDeBaja(motivo, fecha = new Date()) {
    this.estado = PROYECTO_ESTADO.DADO_DE_BAJA;
    this.baja = { motivo, fecha };
  }

  finalizarProyecto(fecha = new Date()) {
    this.estado = PROYECTO_ESTADO.FINALIZADO;
    this.fechaFinalizacion = fecha;
  }

  agregarLogro(datos) {
    this.logros.push(datos);
    return this.logros.at(-1);
  }

  quitarLogro(logro) {
    this.logros = this.logros.filter((l) => l.id !== logro.id);
  }

  agregarPerfil(datos) {
    this.perfiles.push(datos);
    return this.perfiles.at(-1);
  }

  quitarPerfil(perfil) {
    this.perfiles = this.perfiles.filter((existente) => existente.id !== perfil.id);
  }

  buscarPerfil(perfilId) {
    return this.perfiles.find((p) => p.id === String(perfilId)) ?? null;
  }

  yaColaboraron(colaborador) {
    return this.colaboraciones.some((c) => c.esDe(colaborador));
  }

  agregarColaboracion(colaboracion) {
    this.colaboraciones.push(colaboracion);
    return colaboracion;
  }

  buscarColaboracion(colaboracionId) {
    return this.colaboraciones.find((c) => c.id === String(colaboracionId)) ?? null;
  }

  colaboracionesPendientes() {
    return this.colaboraciones
      .filter((c) => c.estaPendiente())
      .sort((a, b) => a.fecha - b.fecha);
  }

  agregarAvance(datos) {
    this.avances.push(datos);
    return this.avances.at(-1);
  }

  ultimoAvance() {
    return this.avances.at(-1) ?? null;
  }

  cantidadAceptadas(perfil) {
    return this.colaboraciones.filter(
      (c) => c.estaAceptada() && String(c.perfil) === String(perfil.id),
    ).length;
  }
}

function datosDePublicacion(proyecto) {
  const publicacion = proyecto.publicacion;
  const plano =
    typeof publicacion?.toObject === "function" ? publicacion.toObject() : publicacion;
  return { ...plano };
}
