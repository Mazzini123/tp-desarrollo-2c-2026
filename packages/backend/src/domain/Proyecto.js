import { PROYECTO_ESTADO } from "./enums/PROYECTO_ESTADO.js";

export class Proyecto {
  estaAbierto() {
    return this.estado === PROYECTO_ESTADO.ABIERTO;
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
