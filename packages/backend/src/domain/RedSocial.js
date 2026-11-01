// Requerimiento adicional 27: enlaces a redes sociales, tanto de
// organizaciones como de personas. Objeto de valor sin comportamiento: lo
// describe redSocialSchema (models/subesquemas.js).

// Una misma URL cargada dos veces es la misma red: se queda la primera.
export function construirRedesSociales(lista = []) {
  const vistas = new Set();
  return lista
    .filter(({ url }) => !vistas.has(url) && vistas.add(url))
    .map(({ nombre, url }) => ({ nombre, url }));
}
