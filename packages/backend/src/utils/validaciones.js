export function tieneContenido(valor) {
  return Boolean(valor) && valor.trim().length > 0;
}

export function tieneAlgunCampoDefinido(objeto) {
  return Object.values(objeto).some((valor) => valor !== undefined);
}
