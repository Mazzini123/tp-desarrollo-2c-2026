import { armarServices, crearColectivoDePrueba, datosDePerfil } from "../fixtures.js";
import { normalizarEtiqueta } from "../../src/domain/etiquetas.js";

describe("Etiquetas (req. adicional 34)", () => {
  test("se normalizan: mayusculas, acentos y espacios dan la misma etiqueta", () => {
    expect(normalizarEtiqueta("  Educación   Popular ")).toBe("educacion-popular");
    expect(normalizarEtiqueta("EDUCACION POPULAR")).toBe("educacion-popular");
  });

  test("filtran el listado de proyectos y el de colectivos", async () => {
    const services = await armarServices();
    const colectivo = await services.colectivoService.crear({
      nombre: "Huerta",
      descripcion: "...",
      tipoColectivo: "ASAMBLEA",
      etiquetas: ["Ambiente", "ambiente", "Barrio"],
    });
    await crearColectivoDePrueba(services.colectivoService);

    const crearProyecto = (titulo, etiquetas) =>
      services.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo,
        descripcion: "...",
        perfiles: [datosDePerfil()],
        etiquetas,
      });
    await crearProyecto("Mapa de huertas", ["Ambiente"]);
    await crearProyecto("Sitio", ["Educación"]);

    expect(colectivo.etiquetas).toEqual(["ambiente", "barrio"]);

    const proyectos = await services.proyectoService.listar({ etiqueta: "ambiente" });
    expect(proyectos.items.map((p) => p.titulo)).toEqual(["Mapa de huertas"]);

    const colectivos = await services.colectivoService.listar({ etiqueta: "barrio" });
    expect(colectivos.total).toBe(1);
  });
});

describe("Redes sociales (req. adicional 27)", () => {
  test("colectivos y colaboradores las cargan y actualizan, sin repetir URLs", async () => {
    const services = await armarServices();
    const red = { nombre: "Instagram", url: "https://instagram.com/huerta" };

    const colectivo = await services.colectivoService.crear({
      nombre: "Huerta",
      descripcion: "...",
      tipoColectivo: "ASAMBLEA",
      redesSociales: [red, red],
    });
    expect(colectivo.redesSociales).toHaveLength(1);

    const ada = await services.colaboradorService.crear({ cuentaGit: "ada" });
    const actualizada = await services.colaboradorService.actualizar(ada.id, {
      redesSociales: [{ nombre: "GitHub", url: "https://github.com/ada" }],
    });
    expect(actualizada.redesSociales[0].nombre).toBe("GitHub");
  });
});
