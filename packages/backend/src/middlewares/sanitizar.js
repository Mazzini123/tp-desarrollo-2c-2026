import { Parser } from "htmlparser2";
import { randomUUID } from "node:crypto";
import { fromMarkdown } from "mdast-util-from-markdown";
import { ELEMENTOS_HTML } from "./elementosHtml.js";

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

const NOMBRE_DE_TEXTO = /^[a-z][a-z0-9,.]*$/;

function esTextoConAngulos(nombre, atributos = {}) {
  return (
    NOMBRE_DE_TEXTO.test(nombre) &&
    !ELEMENTOS_HTML.has(nombre) &&
    Object.entries(atributos).every(
      ([atributo, valor]) => valor === "" && !atributo.startsWith("on"),
    )
  );
}

function quitarTags(texto) {
  let resultado = "";
  let dentroDeDescartable = 0;
  const fuente = () => texto.slice(parser.startIndex, parser.endIndex + 1);

  const parser = new Parser(
    {
      onopentagname(nombre) {
        if (SIN_CONTENIDO.has(nombre)) dentroDeDescartable++;
      },
      onopentag(nombre, atributos) {
        if (dentroDeDescartable === 0 && esTextoConAngulos(nombre, atributos)) {
          resultado += fuente();
        }
      },
      onclosetag(nombre, implicito) {
        if (SIN_CONTENIDO.has(nombre) && dentroDeDescartable > 0) dentroDeDescartable--;
        else if (!implicito && dentroDeDescartable === 0 && esTextoConAngulos(nombre)) {
          resultado += fuente();
        }
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

export function limpiarMarkdown(texto) {
  const { textoOculto, fragmentos } = ocultarCodigoYEnlaces(texto);
  let limpio = limpiarTexto(textoOculto);
  for (const fragmento of fragmentos) {
    limpio = limpio.replaceAll(fragmento.marcador, fragmento.texto);
  }
  return limpio;
}

function ocultarCodigoYEnlaces(texto) {
  const fragmentos = [];
  function recorrer(nodo) {
    const inicio = nodo.position?.start.offset;
    const fin = nodo.position?.end.offset;
    const fuente = inicio === undefined ? "" : texto.slice(inicio, fin);
    if (
      nodo.type === "code" ||
      nodo.type === "inlineCode" ||
      (nodo.type === "link" && fuente.startsWith("<") && fuente.endsWith(">"))
    ) {
      fragmentos.push({ inicio, fin, texto: fuente, marcador: `MD${randomUUID()}FIN` });
      return;
    }
    nodo.children?.forEach(recorrer);
  }
  recorrer(fromMarkdown(texto));
  let textoOculto = texto;
  for (let i = fragmentos.length - 1; i >= 0; i--) {
    const { inicio, fin, marcador } = fragmentos[i];
    textoOculto = textoOculto.slice(0, inicio) + marcador + textoOculto.slice(fin);
  }
  return { textoOculto, fragmentos };
}

const CAMPOS_MARKDOWN = new Set(["descripcion", "presentacion", "comentario", "mensaje"]);

function limpiar(valor, campo) {
  if (typeof valor === "string") {
    return CAMPOS_MARKDOWN.has(campo) ? limpiarMarkdown(valor) : limpiarTexto(valor);
  }
  if (Array.isArray(valor)) {
    return valor.map((item) => limpiar(item, campo));
  }
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, v]) => [clave, limpiar(v, clave)]),
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
