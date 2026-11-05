export class MedioDeContacto {
  equals(otro) {
    return mismoMedioDeContacto(this, otro);
  }
}

export function mismoMedioDeContacto(a, b) {
  return a.tipo === b.tipo && a.valor === b.valor;
}
