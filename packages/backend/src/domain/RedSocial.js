// Requerimiento adicional 27: enlaces a redes sociales, tanto de
// organizaciones como de personas. Objeto de valor: no tiene id propio.
export class RedSocial {
  constructor({ nombre, url }) {
    this.nombre = nombre;
    this.url = url;
  }
}

// Una misma URL cargada dos veces es la misma red: se queda la primera.
export function construirRedesSociales(lista = []) {
  const vistas = new Set();
  return lista
    .filter(({ url }) => !vistas.has(url) && vistas.add(url))
    .map((datos) => new RedSocial(datos));
}
