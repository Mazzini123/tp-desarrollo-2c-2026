export class ModalidadColaboracion {
  constructor({ ofreceIncentivoEconomico, posibilidadDeContratacion } = {}) {
    this.ofreceIncentivoEconomico = ofreceIncentivoEconomico;
    this.posibilidadDeContratacion = posibilidadDeContratacion;
  }

  esGratuito() {
    // Preguntar logica
    // Enunciado: Si ofrecen un incentivo económico y/o si existe la posibilidad de contratación eventual.
    return (this.ofreceIncentivoEconomico && this.posibilidadDeContratacion) || (this.ofreceIncentivoEconomico || this.posibilidadDeContratacion);
  }
}
