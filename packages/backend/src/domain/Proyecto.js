import { randomUUID } from "node:crypto";
import { DomainError } from "./DomainError.js";
import { EstadoProyecto } from "./enums/EstadoProyecto.js";
import { Habilidad } from "./Habilidad.js";
import { CompromisoEsperado } from "./valueObjects/CompromisoEsperado.js";
import { ModalidadColaboracion } from "./valueObjects/ModalidadColaboracion.js";

/**
 * Entidad. Proyecto de software que un Colectivo publica para que
 * personas colaboradoras se postulen. Referencia a su Colectivo por
 * id (colectivoId): el Colectivo no mantiene la lista de sus
 * Proyectos.
 *
 * Requiere al menos una habilidad al crearse. Esas habilidades son
 * siempre referencias al catálogo (ver Habilidad.js): el proyecto no
 * puede "inventar" una habilidad nueva, sólo tomarlas de una lista ya
 * validada por quien llama (típicamente ProyectoService contra
 * HabilidadRepository).
 *
 * Orquestación de casos de uso (registrar una colaboración, validar
 * que la persona tenga alguna de las habilidades requeridas, etc.)
 * vive en ProyectoService / ColaboracionService, no acá.
 */
export class Proyecto {
  #id;
  #titulo;
  #descripcion;
  #estado;
  #colectivoId;
  #compromisoEsperado;
  #modalidadColaboracion;
  #habilidadesRequeridas;

  constructor({
    id = randomUUID(),
    titulo,
    descripcion,
    colectivoId,
    compromisoEsperado,
    modalidadColaboracion,
    habilidadesRequeridas,
    estado = EstadoProyecto.ABIERTO,
  }) {
    if (!titulo || titulo.trim().length === 0) {
      throw new DomainError("El título del proyecto es obligatorio");
    }
    if (!descripcion || descripcion.trim().length === 0) {
      throw new DomainError("La descripción del proyecto es obligatoria");
    }
    if (!colectivoId) {
      throw new DomainError("El proyecto debe pertenecer a un colectivo (colectivoId)");
    }
    if (!(compromisoEsperado instanceof CompromisoEsperado)) {
      throw new DomainError("compromisoEsperado debe ser una instancia de CompromisoEsperado");
    }
    if (!(modalidadColaboracion instanceof ModalidadColaboracion)) {
      throw new DomainError(
        "modalidadColaboracion debe ser una instancia de ModalidadColaboracion",
      );
    }
    if (!Array.isArray(habilidadesRequeridas) || habilidadesRequeridas.length === 0) {
      throw new DomainError("El proyecto debe requerir al menos una habilidad");
    }
    if (!habilidadesRequeridas.every((h) => h instanceof Habilidad)) {
      throw new DomainError("Todas las habilidades requeridas deben ser instancias de Habilidad");
    }

    this.#id = id;
    this.#titulo = titulo.trim();
    this.#descripcion = descripcion.trim();
    this.#colectivoId = colectivoId;
    this.#compromisoEsperado = compromisoEsperado;
    this.#modalidadColaboracion = modalidadColaboracion;
    this.#estado = estado;
    // dedupe por si llegan repetidas
    this.#habilidadesRequeridas = [];
    habilidadesRequeridas.forEach((h) => this.agregarHabilidadRequerida(h));
  }

  get id() {
    return this.#id;
  }

  get titulo() {
    return this.#titulo;
  }

  get descripcion() {
    return this.#descripcion;
  }

  get estado() {
    return this.#estado;
  }

  get colectivoId() {
    return this.#colectivoId;
  }

  get compromisoEsperado() {
    return this.#compromisoEsperado;
  }

  get modalidadColaboracion() {
    return this.#modalidadColaboracion;
  }

  get habilidadesRequeridas() {
    return [...this.#habilidadesRequeridas];
  }

  agregarHabilidadRequerida(habilidad) {
    if (!(habilidad instanceof Habilidad)) {
      throw new DomainError("Se esperaba una instancia de Habilidad");
    }
    if (this.requiereHabilidad(habilidad)) {
      return; // idempotente
    }
    this.#habilidadesRequeridas.push(habilidad);
  }

  quitarHabilidadRequerida(habilidad) {
    if (this.#habilidadesRequeridas.length <= 1) {
      throw new DomainError(
        "El proyecto debe conservar al menos una habilidad requerida",
      );
    }
    this.#habilidadesRequeridas = this.#habilidadesRequeridas.filter(
      (h) => !h.equals(habilidad),
    );
  }

  /**
   * Edición de título y descripción. Deliberadamente no toca estado,
   * colectivoId, compromiso, modalidad ni habilidades: cada uno de
   * esos tiene su propia operación (finalizar, agregar/quitar
   * habilidad) porque cambiarlos implica una decisión de negocio
   * distinta a corregir un texto.
   */
  actualizarDatos({ titulo, descripcion }) {
    if (titulo !== undefined) {
      if (!titulo || titulo.trim().length === 0) {
        throw new DomainError("El título del proyecto es obligatorio");
      }
      this.#titulo = titulo.trim();
    }
    if (descripcion !== undefined) {
      if (!descripcion || descripcion.trim().length === 0) {
        throw new DomainError("La descripción del proyecto es obligatoria");
      }
      this.#descripcion = descripcion.trim();
    }
  }

  requiereHabilidad(habilidad) {
    return this.#habilidadesRequeridas.some((h) => h.equals(habilidad));
  }

  estaAbierto() {
    return this.#estado === EstadoProyecto.ABIERTO;
  }

  /**
   * Transición de estado simple (guardia sobre el propio dato).
   * La regla de negocio "no se puede reabrir" se cumple porque no
   * existe una operación inversa. Cualquier efecto colateral sobre
   * otras entidades (rechazar postulaciones pendientes, etc., en
   * entregas futuras) lo coordina ProyectoService, no este método.
   */
  finalizar() {
    if (!this.estaAbierto()) {
      throw new DomainError("El proyecto ya está finalizado");
    }
    this.#estado = EstadoProyecto.FINALIZADO;
  }

  toJSON() {
    return {
      id: this.#id,
      titulo: this.#titulo,
      descripcion: this.#descripcion,
      estado: this.#estado,
      colectivoId: this.#colectivoId,
      compromisoEsperado: this.#compromisoEsperado.toJSON(),
      modalidadColaboracion: this.#modalidadColaboracion.toJSON(),
      habilidadesRequeridas: this.#habilidadesRequeridas.map((h) => h.toJSON()),
    };
  }
}
