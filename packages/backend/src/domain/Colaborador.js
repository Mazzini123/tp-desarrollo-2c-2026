import { mismoMedioDeContacto } from "./MedioDeContacto.js";

export class Colaborador {
  estaDadaDeBaja() {
    return this.fechaBaja !== null && this.fechaBaja !== undefined;
  }

  darDeBaja(fecha) {
    this.fechaBaja = fecha;
  }

  tienePronombre(pronombre) {
    return this.pronombres.includes(pronombre);
  }

  tieneMedioDeContacto(medioDeContacto) {
    return this.mediosDeContacto.some((mc) => mismoMedioDeContacto(mc, medioDeContacto));
  }

  agregarMedioDeContacto(medioDeContacto) {
    this.mediosDeContacto.push(medioDeContacto);
  }

  quitarMedioDeContacto(medioDeContacto) {
    this.mediosDeContacto = this.mediosDeContacto.filter(
      (mc) => !mismoMedioDeContacto(mc, medioDeContacto),
    );
  }

  agregarPronombre(pronombre) {
    this.pronombres.push(pronombre);
  }

  quitarPronombre(pronombre) {
    this.pronombres = this.pronombres.filter((p) => p !== pronombre);
  }

  reemplazarPronombres(pronombres) {
    this.pronombres = [...new Set(pronombres)];
  }

  tieneHabilidad(habilidad) {
    return this.habilidades.some((h) => h.equals(habilidad));
  }

  agregarHabilidad(habilidad) {
    if (this.tieneHabilidad(habilidad)) {
      return;
    }
    this.habilidades.push(habilidad);
  }

  quitarHabilidad(habilidad) {
    this.habilidades = this.habilidades.filter((h) => !h.equals(habilidad));
  }

  nombreParaMostrar() {
    if (this.nombreFantasia) return this.nombreFantasia;
    if (this.nombre && this.apellido) return `${this.nombre} ${this.apellido}`;
    return this.cuentaGit;
  }
}
