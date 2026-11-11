import { limpiarTexto } from "../../src/middlewares/sanitizar.js";

describe("Sanitizacion de textos (req. adicional 11)", () => {
  test.each([
    ["un script", "hola <script>alert(1)</script>mundo", "hola mundo"],
    ["un iframe", "<iframe src='https://malo.com'></iframe>ok", "ok"],
    ["un atributo con codigo", '<img src=x onerror="alert(1)">foto', "foto"],
    ["tags inofensivos", "<b>negrita</b> y <i>cursiva</i>", "negrita y cursiva"],
    [
      "un script que se rearma al sacar el de adentro",
      "<<script></script>script>alert(1)<</script>/script>",
      "",
    ],
  ])("saca %s", (_caso, entrada, esperado) => {
    expect(limpiarTexto(entrada)).toBe(esperado);
  });

  test.each([
    ["comparaciones", "a < b && c > d"],
    ["comillas y ampersand", 'Tom & Jerry dicen "hola"'],
    ["un corazon", "gracias <3"],
    ["una URL con parametros", "https://ejemplo.org/?a=1&not=2&copy=3"],
    // Una entidad no es un tag: bien mostrada, se ve como texto.
    ["un tag escrito con entidades", "&lt;script&gt;alert(1)&lt;/script&gt;"],
  ])("no toca texto sin HTML: %s", (_caso, texto) => {
    expect(limpiarTexto(texto)).toBe(texto);
  });

  // Requerimiento adicional 38: las descripciones pueden tener Markdown. Como
  // Markdown no es HTML, la sanitizacion lo tiene que dejar intacto.
  test("el Markdown sobrevive intacto (req. adicional 38)", () => {
    const markdown = [
      "# Titulo",
      "Texto con **negrita**, _cursiva_ y `codigo`.",
      "> una cita",
      "- item 1",
      "- item 2",
      "[un link](https://github.com/Mazzini123) y ![imagen](https://x.com/a.png)",
      "```js",
      "if (a < b) console.log(a);",
      "```",
    ].join("\n");

    expect(limpiarTexto(markdown)).toBe(markdown);
  });

  test("HTML metido adentro del Markdown se saca igual", () => {
    expect(limpiarTexto("**hola** <script>robar()</script>")).toBe("**hola** ");
  });
});

describe("Sanitizacion · texto con angulos que no es HTML", () => {
  test.each([
    ["una comparacion sin espacios", "si x<y entonces z>w"],
    ["un generico", "Uso Array<string> y Map<K,V>"],
    ["un generico cerrado", "List<T> y Set<T></T>"],
    ["un placeholder", "Escribi <nombre> y <apellido>"],
  ])("conserva %s", (_caso, texto) => {
    expect(limpiarTexto(texto)).toBe(texto);
  });

  test.each([
    ["un manejador en un tag inventado", "<y onclick=alert(1)>hola</y>", "hola"],
    ["un manejador sin valor", "<y onmouseover>hola", "hola"],
    ["un atributo con valor", '<y style="position:fixed">hola', "hola"],
    ["un elemento personalizado", "<mi-widget>hola</mi-widget>", "hola"],
    ["image, que el navegador trata como img", "<image src=x onerror=a()>hola", "hola"],
    ["un tag inventado dentro de un script", "<script><y>x</y></script>fin", "fin"],
  ])("igual saca %s", (_caso, entrada, esperado) => {
    expect(limpiarTexto(entrada)).toBe(esperado);
  });
});

describe("Sanitizacion · casos rebuscados", () => {
  test.each([
    ["tag partido para esquivar un filtro", "<scr<script>ipt>alert(1)</script>fin"],
    ["cierre de textarea", "</textarea/><script>a</script>fin"],
    ["svg con script adentro", "<svg><script>x</script></svg>fin"],
    ["mayusculas", "<SCRIPT>x</SCRIPT>fin"],
  ])("%s: no queda ningun tag", (_caso, entrada) => {
    const limpio = limpiarTexto(entrada);
    expect(limpio).not.toMatch(/<\s*\/?\s*[a-z]/i);
    expect(limpio.endsWith("fin")).toBe(true);
  });
});
