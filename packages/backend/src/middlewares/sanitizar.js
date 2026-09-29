import { Parser } from "htmlparser2";

// Requerimiento adicional 11: "asegurarse de que ninguno de los campos
// textuales que una persona pueda ingresar contengan tags HTML peligrosos,
// como iframes, scripts, etc."
//
// La API guarda texto plano (o Markdown, que es texto con convenciones),
// nunca HTML. Por eso no hay lista de tags permitidos: se sacan todos.
//
// El texto se recorre con htmlparser2, el mismo parser que usan las
// librerias de sanitizacion: entiende HTML mal formado igual que un
// navegador, cosa que una expresion regular no puede hacer.

// Tags cuyo CONTENIDO tambien se descarta, no solo la etiqueta: el texto de
// adentro de un <script> es codigo, no algo que la persona quiso escribir.
const SIN_CONTENIDO = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template",
  "textarea", "title", "xmp", "noembed", "noframes", "svg", "math",
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
    // Las entidades (&amp;, &lt;...) se dejan como estan: "&lt;script&gt;" no es
    // un tag, es texto que bien mostrado se ve como "<script>". Decodificarlas
    // ademas romperia URLs: "?a=1&not=2" se convertiria en "?a=1¬=2".
    { decodeEntities: false, lowerCaseTags: true },
  );

  parser.write(texto);
  parser.end();
  return resultado;
}

const MAXIMO_DE_PASADAS = 5;

// Se repite hasta que el texto no cambia. Una sola pasada no alcanza: en
// "<<script></script>script>alert(1)<</script>/script>", sacar los tags de
// adentro deja armado un "<script>alert(1)</script>" nuevo, y es la segunda
// pasada la que lo saca.
export function limpiarTexto(texto) {
  let actual = texto;

  for (let pasada = 0; pasada < MAXIMO_DE_PASADAS; pasada++) {
    const limpio = quitarTags(actual);
    if (limpio === actual) {
      return limpio;
    }
    actual = limpio;
  }

  // Un texto armado para no estabilizarse se descarta entero.
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
    return Object.fromEntries(Object.entries(valor).map(([clave, v]) => [clave, limpiar(v)]));
  }
  return valor;
}

// Va antes de las rutas: asi Zod valida el texto ya limpio (un campo que era
// solo un <script> queda vacio y falla el min(1) con un 400).
export function sanitizarBody(req, _res, next) {
  if (req.body) {
    req.body = limpiar(req.body);
  }
  next();
}
