import { randomUUID } from "node:crypto";

export class Perfil {
  constructor({ id = randomUUID(), descripcion, compromiso, modalidadColaboracion }) {
    this.id = id;
    this.habilidadesRequeridas = [];
    this.habilidadesOpcionales = [];
    this.descripcion = descripcion;
    this.compromiso = compromiso;
    this.modalidadColaboracion = modalidadColaboracion;
  }

  tieneHabilidad(lista, habilidad) {
    return lista.some((item) => item.equals(habilidad));
  }

  tieneHabilidadRequerida(habilidad) {
    return this.tieneHabilidad(this.habilidadesRequeridas, habilidad);
  }

  tieneHabilidadOpcional(habilidad) {
    return this.tieneHabilidad(this.habilidadesOpcionales, habilidad);
  }

  agregarHabilidadRequerida(habilidad) {
    this.habilidadesRequeridas.push(habilidad);
  }

  agregarHabilidadOpcional(habilidad) {
    this.habilidadesOpcionales.push(habilidad);
  }

  quitarHabilidadOpcional(habilidad) {
    this.habilidadesOpcionales = this.habilidadesOpcionales.filter(
      (item) => !item.equals(habilidad),
    );
  }

  quitarHabilidadRequerida(habilidad) {
    this.habilidadesRequeridas = this.habilidadesRequeridas.filter(
      (item) => !item.equals(habilidad),
    );
  }

  cumpleHabilidadesRequeridas(colaborador) {
    return (
      this.habilidadesRequeridas.length > 0 &&
      this.habilidadesRequeridas.every((habilidad) =>
        colaborador.tieneHabilidad(habilidad),
      )
    );
  }

  cumpleAlgunaHabilidadOpcional(colaborador) {
    return this.habilidadesOpcionales.some((habilidad) =>
      colaborador.tieneHabilidad(habilidad),
    );
  }
}
