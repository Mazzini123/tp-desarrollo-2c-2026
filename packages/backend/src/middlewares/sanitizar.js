import { Parser } from "htmlparser2";

const SIN_CONTENIDO = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
  "template",
  "textarea",
  "title",
  "xmp",
  "noembed",
  "noframes",
  "svg",
  "math",
]);

function quitarTags(texto) {
  let resultado = "";
  let dentroDeDescartable = 0;

  const parser = new Parser(
    {
      onopentagname(nombre) {
        if (SIN_CONTENIDO.has(nombre)) dentroDeDescartable++;
      },
      onclosetag(nombre) {
        if (SIN_CONTENIDO.has(nombre) && dentroDeDescartable > 0) dentroDeDescartable--;
      },
      ontext(fragmento) {
        if (dentroDeDescartable === 0) resultado += fragmento;
      },
    },
    { decodeEntities: false, lowerCaseTags: true },
  );

  parser.write(texto);
  parser.end();
  return resultado;
}

const MAXIMO_DE_PASADAS = 5;

export function limpiarTexto(texto) {
  let actual = texto;

  for (let pasada = 0; pasada < MAXIMO_DE_PASADAS; pasada++) {
    const limpio = quitarTags(actual);
    if (limpio === actual) {
      return limpio;
    }
    actual = limpio;
  }

  return "";
}

function limpiar(valor) {
  if (typeof valor === "string") {
    return limpiarTexto(valor);
  }
  if (Array.isArray(valor)) {
    return valor.map(limpiar);
  }
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, v]) => [clave, limpiar(v)]),
    );
  }
  return valor;
}

export function sanitizarBody(req, _res, next) {
  if (req.body) {
    req.body = limpiar(req.body);
  }
  next();
}
