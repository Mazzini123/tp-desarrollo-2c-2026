import { PROYECTO_ESTADO } from "./enums/PROYECTO_ESTADO.js";

export class Proyecto {
  estaAbierto() {
    return this.estado === PROYECTO_ESTADO.ABIERTO;
  }

  finalizarProyecto(fecha = new Date()) {
    this.estado = PROYECTO_ESTADO.FINALIZADO;
    this.fechaFinalizacion = fecha;
  }

  cierreVencido(ahora) {
    return this.estaAbierto() && Boolean(this.fechaCierre) && this.fechaCierre <= ahora;
  }

  cumpleAlgunPerfil(colaborador) {
    return this.perfiles.some((perfil) =>
      perfil.cumpleHabilidadesRequeridas(colaborador),
    );
  }

  agregarLogro(datos) {
    const logro = this.logros.create(datos);
    this.logros.push(logro);
    return logro;
  }

  quitarLogro(logro) {
    this.logros = this.logros.filter((l) => l.id !== logro.id);
  }

  agregarPerfil(datos) {
    const perfil = this.perfiles.create(datos);
    this.perfiles.push(perfil);
    return perfil;
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

  yaSePostuloAlPerfil(colaborador, perfil) {
    return this.colaboraciones.some(
      (c) =>
        c.esDe(colaborador) &&
        !c.estaRetirada() &&
        String(c.perfil) === String(perfil.id),
    );
  }

  agregarColaboracion(datos) {
    const colaboracion = this.colaboraciones.create(datos);
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
    const avance = this.avances.create(datos);
    this.avances.push(avance);
    return avance;
  }

  ultimoAvance() {
    return this.avances.at(-1) ?? null;
  }

  cantidadAceptadas(perfil) {
    return this.colaboraciones.filter(
      (c) => c.estaAceptada() && String(c.perfil) === String(perfil.id),
    ).length;
  }

  aceptaPostulaciones(ahora = new Date()) {
    return this.estaAbierto() && this.perfiles.some((p) => p.aceptaPostulaciones(ahora));
  }

  puedeVerContactoDe(colaborador) {
    return this.colaboraciones.some(
      (c) => c.esDe(colaborador) && c.estaAceptada() && c.esPublica,
    );
  }
}
