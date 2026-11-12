import mongoose from "mongoose";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { limpiarMarkdown } from "../../src/middlewares/sanitizar.js";
import { estadoDeBusquedaConCupo } from "../../src/services/reglasDeBusqueda.js";

const perfilValido = {
  descripcion: "d",
  compromiso: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
  modalidadColaboracion: "GRATUITA",
  habilidadesRequeridas: [{ codigo: "node", titulo: "Node" }],
};

test.each([
  { compromiso: { cantidadHoras: -5, periodo: "HS_MENSUALES" } },
  { compromiso: { cantidadHoras: 1.5, periodo: "HS_MENSUALES" } },
  { compromiso: { cantidadHoras: 5, periodo: "INVENTADO" } },
  { modalidadColaboracion: "INVENTADA" },
  { habilidadesRequeridas: [] },
  { limiteColaboraciones: -1 },
  { modoAceptacion: "TODO_SUMA", limiteColaboraciones: 1 },
])("el ODM rechaza una invariante inválida aunque se omita HTTP: %j", async (cambios) => {
  const proyecto = new ProyectoModel({
    colectivoId: new mongoose.Types.ObjectId(),
    datosDelColectivo: { nombre: "ONG", tipoColectivo: "ONG" },
    titulo: "t",
    descripcion: "d",
    perfiles: [{ ...perfilValido, ...cambios }],
  });
  await expect(proyecto.validate()).rejects.toBeInstanceOf(
    mongoose.Error.ValidationError,
  );
});

test.each([
  "`Array<string>` y <https://example.com>",
  "```html\n<script>ejemplo()</script>\n```",
  "~~~js\nconst x = `<div>`;\n~~~",
])("conserva la fuente Markdown de código y enlaces: %s", (fuente) =>
  expect(limpiarMarkdown(fuente)).toBe(fuente),
);

test("el HTML peligroso fuera de un bloque de código se elimina", () => {
  expect(limpiarMarkdown("**hola** <script>robar()</script> `Array<string>`")).toBe(
    "**hola**  `Array<string>`",
  );
});

test("limpiar Markdown elimina bloques peligrosos y conserva código dentro de HTML inofensivo", () => {
  expect(limpiarMarkdown("<script>robar()</script>\n\n<b>`Array<string>`</b>")).toBe(
    "\n\n`Array<string>`",
  );
});

test("las consultas puras priorizan el vencimiento del proyecto sobre el cupo", () => {
  expect(
    estadoDeBusquedaConCupo(
      { busquedaAbierta: true },
      { proyectoAbierto: true, fechaCierre: new Date(0), cupoCompleto: true },
    ),
  ).toBe("CERRADA");
});
