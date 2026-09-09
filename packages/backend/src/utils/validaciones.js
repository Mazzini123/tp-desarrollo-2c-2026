export function tieneContenido(valor) {
  return Boolean(valor) && valor.trim().length > 0;
}

export function esValorDeEnum(enumerativo, valor) {
  return Object.values(enumerativo).includes(valor);
}
