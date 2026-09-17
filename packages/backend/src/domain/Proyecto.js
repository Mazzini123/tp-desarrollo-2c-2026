import { randomUUID } from "node:crypto";
import { PROYECTO_ESTADO } from "./enums/PROYECTO_ESTADO.js";

export class Proyecto {
  constructor({
    id = randomUUID(),
    titulo,
    descripcion,
    urlSistema,
    urlRepositorio,
    estado = PROYECTO_ESTADO.ABIERTO,
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
  }

  estaAbierto() {
    return this.estado === PROYECTO_ESTADO.ABIERTO;
  }

  finalizarProyecto() {
    this.estado = PROYECTO_ESTADO.FINALIZADO;
  }

  cumpleAlgunaHabilidadRequerida(colaborador) {
    return this.perfiles.some(perfil => perfil.cumpleAlgunaHabilidadRequerida(colaborador));
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
    this.perfiles = this.perfiles.filter((p) => p !== perfil);
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
}
