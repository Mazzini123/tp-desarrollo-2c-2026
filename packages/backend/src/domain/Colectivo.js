import { mismoMedioDeContacto } from "./MedioDeContacto.js";

export class Colectivo {
  estaDadoDeBaja() {
    return this.fechaBaja !== null && this.fechaBaja !== undefined;
  }

  darDeBaja(fecha) {
    this.fechaBaja = fecha;
  }

  tieneMedioDeContacto(medio) {
    return this.mediosDeContacto.some((existente) =>
      mismoMedioDeContacto(existente, medio),
    );
  }

  agregarMedioDeContacto(medio) {
    this.mediosDeContacto.push(medio);
  }

  quitarMedioDeContacto(medio) {
    this.mediosDeContacto = this.mediosDeContacto.filter(
      (existente) => !mismoMedioDeContacto(existente, medio),
    );
  }
}
