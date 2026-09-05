/**
 * Modalidad de colaboración de un Proyecto. Si no ofrece incentivo
 * económico ni posibilidad de contratación, la colaboración es
 * gratuita.
 */
export class ModalidadColaboracion {
  constructor({ ofreceIncentivoEconomico = false, posibilidadDeContratacion = false } = {}) {
    this.ofreceIncentivoEconomico = ofreceIncentivoEconomico;
    this.posibilidadDeContratacion = posibilidadDeContratacion;
  }

  esGratuito() {
    return !this.ofreceIncentivoEconomico && !this.posibilidadDeContratacion;
  }
}
