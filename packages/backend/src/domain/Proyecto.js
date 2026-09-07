import { randomUUID } from "node:crypto";
import { PROYECTO_ESTADO } from "./enums/ProyectoEstado.js";
import { MODALIDAD_COLABORACION } from "./enums/ModalidadColaboracion.js";

export class Proyecto {
  constructor({
    id = randomUUID(),
    titulo,
    descripcion,
    modalidadColaboracion = MODALIDAD_COLABORACION.GRATUITA,
    compromisoEsperado,
    habilidadesNecesarias = [],
    estado = PROYECTO_ESTADO.ABIERTO,
  }) {
    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.compromisoEsperado = compromisoEsperado;
    this.modalidadColaboracion = modalidadColaboracion;
    this.estado = estado;
    this.colaboraciones = [];
    this.habilidadesNecesarias = habilidadesNecesarias;
  }

  estaAbierto() {
    return this.estado === PROYECTO_ESTADO.ABIERTO;
  }

  finalizarProyecto() {
    this.estado = PROYECTO_ESTADO.FINALIZADO;
  }

  cumpleAlgunaHabilidadRequerida(colaborador) {
    return this.habilidadesNecesarias.some((h) => colaborador.tieneHabilidad(h));
  }

  agregarHabilidadRequerida(habilidad) {
    if (this.habilidadesNecesarias.some((h) => h.equals(habilidad))) {
      return;
    }
    this.habilidadesNecesarias.push(habilidad);
  }

  quitarHabilidadRequerida(habilidad) {
    this.habilidadesNecesarias = this.habilidadesNecesarias.filter(
      (h) => !h.equals(habilidad),
    );
  }

  yaColaboraron(colaborador) {
    return this.colaboraciones.some((c) => c.colaborador.id === colaborador.id);
  }

  agregarColaboracion(colaboracion) {
    this.colaboraciones.push(colaboracion);
  }

  quitarColaboracion(colaboracion) {
    this.colaboraciones = this.colaboraciones.filter((c) => !c.equals(colaboracion));
  }
}
