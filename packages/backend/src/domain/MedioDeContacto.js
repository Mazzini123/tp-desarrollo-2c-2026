// Objeto de valor: no tiene id propio. Se guarda adentro del documento que lo
// contiene (ver medioDeContactoSchema en models/subesquemas.js, que carga
// esta clase con loadClass).
export class MedioDeContacto {
  // Dos medios son el mismo si coinciden tipo y valor.
  equals(otro) {
    return mismoMedioDeContacto(this, otro);
  }
}

// Funcion suelta para comparar tambien los datos que llegan por HTTP, que
// todavia no son subdocumentos.
export function mismoMedioDeContacto(a, b) {
  return a.tipo === b.tipo && a.valor === b.valor;
}
