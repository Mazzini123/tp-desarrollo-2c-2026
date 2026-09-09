const setsAArrays = (_clave, valor) => (valor instanceof Set ? [...valor] : valor);

export function serializar(valor) {
  return JSON.parse(JSON.stringify(valor, setsAArrays));
}
