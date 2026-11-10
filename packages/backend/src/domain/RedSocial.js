export function construirRedesSociales(lista = []) {
  const vistas = new Set();
  return lista
    .filter(({ url }) => !vistas.has(url) && vistas.add(url))
    .map(({ nombre, url }) => ({ nombre, url }));
}
