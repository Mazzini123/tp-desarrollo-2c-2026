import { randomUUID } from "node:crypto";
import { PROYECTO_ESTADO } from "./enums/PROYECTO_ESTADO.js";
import { MODO_ACEPTACION } from "./enums/MODO_ACEPTACION.js";

export class Proyecto {
  constructor({
    id = randomUUID(),
    titulo,
    descripcion,
    urlSistema,
    urlRepositorio,
    estado = PROYECTO_ESTADO.ABIERTO,
    modoAceptacion = MODO_ACEPTACION.TODO_SUMA,
    limiteVacantes = null,
  }) {
    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.estado = estado;
    this.porcentajeConcrecion = 0;
    this.colaboraciones = [];
    this.logros = [];
    this.perfiles = [];
    this.urlSistema = urlSistema;
    this.urlRepositorio = urlRepositorio;
    this.etiquetas = [];
    // Requerimiento adicional 8. TODO_SUMA sin limite es lo que pasaba antes
    // de que existieran las postulaciones: quien se anota, queda adentro.
    this.modoAceptacion = modoAceptacion;
    this.limiteVacantes = limiteVacantes;
  }

  estaAbierto() {
    return this.estado === PROYECTO_ESTADO.ABIERTO;
  }

  finalizarProyecto() {
    this.estado = PROYECTO_ESTADO.FINALIZADO;
  }

  cumpleAlgunPerfil(colaborador) {
    return this.perfiles.some((perfil) => perfil.cumpleHabilidadesRequeridas(colaborador));
  }

  agregarLogro(logro) {
    this.logros.push(logro);
  }

  quitarLogro(logro) {
    this.logros = this.logros.filter((l) => l !== logro);
  }

  agregarPerfil(perfil) {
    this.perfiles.push(perfil);
  }

  quitarPerfil(perfil) {
    this.perfiles = this.perfiles.filter((existente) => existente.id !== perfil.id);
  }

  yaColaboraron(colaborador) {
    return this.colaboraciones.some((c) => c.colaborador.id === colaborador.id);
  }

  agregarColaboracion(colaboracion) {
    this.colaboraciones.push(colaboracion);
  }

  quitarColaboracion(colaboracion) {
    this.colaboraciones = this.colaboraciones.filter((c) => c !== colaboracion);
  }

  buscarColaboracion(colaboracionId) {
    return this.colaboraciones.find((c) => c.id === colaboracionId) ?? null;
  }

  // Las pendientes en el orden en que llegaron: se resuelven en ese orden.
  colaboracionesPendientes() {
    return this.colaboraciones.filter((c) => c.estaPendiente()).sort((a, b) => a.fecha - b.fecha);
  }

  cantidadAceptadas() {
    return this.colaboraciones.filter((c) => c.estaAceptada()).length;
  }

  tieneLimiteDeVacantes() {
    return this.limiteVacantes !== null && this.limiteVacantes !== undefined;
  }

  // El cupo se calcula, no se guarda: asi nunca queda desincronizado con las
  // colaboraciones reales.
  cupoCompleto() {
    return this.tieneLimiteDeVacantes() && this.cantidadAceptadas() >= this.limiteVacantes;
  }

  aceptaPostulaciones() {
    return this.estaAbierto() && !this.cupoCompleto();
  }
}
