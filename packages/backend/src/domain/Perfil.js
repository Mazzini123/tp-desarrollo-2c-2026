export class Perfil {
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

  codigosRequeridos() {
    return this.habilidadesRequeridas.map((h) => h.codigo);
  }

  codigosOpcionales() {
    return this.habilidadesOpcionales.map((h) => h.codigo);
  }

  tieneLimite() {
    return this.limiteColaboraciones !== null && this.limiteColaboraciones !== undefined;
  }

  limiteAlcanzado(cantidadAceptadas) {
    return this.tieneLimite() && cantidadAceptadas >= this.limiteColaboraciones;
  }
}
