export class MedioDeContacto {
  constructor({ tipo, valor }) {
    this.tipo = tipo;
    this.valor = valor;
  }

  // Dos medios son el mismo si coinciden tipo y valor: no tienen id propio.
  equals(otro) {
    return this.tipo === otro.tipo && this.valor === otro.valor;
  }
}
