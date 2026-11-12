export class MedioDeContacto {
  equals(otro) {
    return mismoMedioDeContacto(this, otro);
  }
}

export function mismoMedioDeContacto(a, b) {
  return a.tipo === b.tipo && a.valor === b.valor;
}

export function sinMediosRepetidos(lista = []) {
  return lista
    .map(({ tipo, valor }) => ({ tipo, valor }))
    .filter(
      (medio, i, todos) =>
        todos.findIndex((otro) => mismoMedioDeContacto(otro, medio)) === i,
    );
}
