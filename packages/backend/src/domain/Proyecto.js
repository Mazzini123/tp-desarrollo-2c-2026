import { randomUUID } from "node:crypto";
import { DomainError, ConflictError } from "../errors/index.js";
import { PROYECTO_ESTADO } from "./enums/ProyectoEstado.js";
import { Habilidad } from "./Habilidad.js";
import { Colaboracion } from "./Colaboracion.js";
import { Compromiso } from "./Compromiso.js";
import { ModalidadColaboracion } from "./ModalidadColaboracion.js";

/**
 * Proyecto que un Colectivo publica para que colaboradores se sumen.
 *
 * Vive dentro del Colectivo, y a su vez contiene sus Colaboraciones y
 * las Habilidades que necesita. Las habilidades son siempre
 * referencias al catálogo: el servicio las resuelve antes de
 * construir el proyecto.
 */
export class Proyecto {
  constructor({
    id = randomUUID(),
    titulo,
    descripcion,
    habilidadesNecesarias,
    modalidadColaboracion,
    compromisoEsperado,
    estado = PROYECTO_ESTADO.ABIERTO,
  }) {
    if (!titulo || titulo.trim().length === 0) {
      throw new DomainError("El título del proyecto es obligatorio");
    }
    if (!descripcion || descripcion.trim().length === 0) {
      throw new DomainError("La descripción del proyecto es obligatoria");
    }
    if (!(compromisoEsperado instanceof Compromiso)) {
      throw new DomainError("compromisoEsperado debe ser una instancia de Compromiso");
    }
    if (!(modalidadColaboracion instanceof ModalidadColaboracion)) {
      throw new DomainError(
        "modalidadColaboracion debe ser una instancia de ModalidadColaboracion",
      );
    }
    if (!Array.isArray(habilidadesNecesarias) || habilidadesNecesarias.length === 0) {
      throw new DomainError("El proyecto debe necesitar al menos una habilidad");
    }

    this.id = id;
    this.titulo = titulo.trim();
    this.descripcion = descripcion.trim();
    this.compromisoEsperado = compromisoEsperado;
    this.modalidadColaboracion = modalidadColaboracion;
    this.estado = estado;
    this.colaboraciones = [];
    this.habilidadesNecesarias = [];
    habilidadesNecesarias.forEach((h) => this.agregarHabilidadRequerida(h));
  }

  estaAbierto() {
    return this.estado === PROYECTO_ESTADO.ABIERTO;
  }

  /**
   * No existe operación inversa: una vez finalizado, el proyecto no
   * se reabre (decisión confirmada con la cátedra).
   */
  finalizarProyecto() {
    if (!this.estaAbierto()) {
      throw new ConflictError("El proyecto ya está finalizado");
    }
    this.estado = PROYECTO_ESTADO.FINALIZADO;
  }

  /**
   * El colaborador cumple si tiene al menos una de las habilidades
   * que el proyecto necesita (requerimiento 2b del enunciado).
   */
  cumpleHabilidadesRequeridas(colaborador) {
    return this.habilidadesNecesarias.some((h) => colaborador.tieneHabilidad(h));
  }

  agregarHabilidadRequerida(habilidad) {
    if (!(habilidad instanceof Habilidad)) {
      throw new DomainError("Se esperaba una instancia de Habilidad");
    }
    if (this.habilidadesNecesarias.some((h) => h.equals(habilidad))) {
      return; // idempotente
    }
    this.habilidadesNecesarias.push(habilidad);
  }

  quitarHabilidadRequerida(habilidad) {
    if (this.habilidadesNecesarias.length <= 1) {
      throw new DomainError("El proyecto debe conservar al menos una habilidad necesaria");
    }
    this.habilidadesNecesarias = this.habilidadesNecesarias.filter(
      (h) => !h.equals(habilidad),
    );
  }

  yaColaboraron(colaborador) {
    return this.colaboraciones.some((c) => c.colaborador.id === colaborador.id);
  }

  agregarColaboracion(colaboracion) {
    if (!(colaboracion instanceof Colaboracion)) {
      throw new DomainError("Se esperaba una instancia de Colaboracion");
    }
    this.colaboraciones.push(colaboracion);
  }

  actualizarDatos({ titulo, descripcion }) {
    if (titulo !== undefined) {
      this.titulo = titulo.trim();
    }
    if (descripcion !== undefined) {
      this.descripcion = descripcion.trim();
    }
  }
}
