import { armarServices, datosDePerfil, CODIGOS } from "../fixtures.js";
import { ConflictError } from "../../src/errors/ConflictError.js";

// Requerimiento adicional 23: eliminacion de colectivos.
describe("Baja de un colectivo", () => {
  let services;
  let colectivo;
  let proyecto;
  let postulacion;

  beforeEach(async () => {
    services = await armarServices();
    colectivo = await services.colectivoService.crear({
      nombre: "Huerta",
      descripcion: "...",
      tipoColectivo: "ASAMBLEA",
      mediosDeContacto: [{ tipo: "EMAIL", valor: "huerta@mail.com" }],
      redesSociales: [{ nombre: "IG", url: "https://instagram.com/huerta" }],
    });
    proyecto = await services.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo: "Mapa",
      descripcion: "...",
      perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
      modoAceptacion: "REVISION_MANUAL",
    });
    const ada = await services.colaboradorService.crear({
      cuentaGit: "ada",
      codigosHabilidades: [CODIGOS.node],
    });
    postulacion = await services.colaboracionService.registrar({
      proyectoId: proyecto.id,
      colaboradorId: ada.id,
    });
  });

  test("borra los datos de contacto pero conserva la historia", async () => {
    await services.colectivoService.darDeBaja(colectivo.id);
    const guardado = await services.colectivoService.buscarPorId(colectivo.id);

    expect(guardado.fechaBaja).toBeInstanceOf(Date);
    expect(guardado.mediosDeContacto).toEqual([]);
    expect(guardado.redesSociales).toEqual([]);
    expect(guardado.nombre).toBe("Huerta");
    expect(guardado.proyectos).toHaveLength(1);
  });

  test("cierra los proyectos abiertos, con sus consecuencias", async () => {
    await services.colectivoService.darDeBaja(colectivo.id);

    expect(proyecto.estado).toBe("FINALIZADO");
    expect(postulacion.estado).toBe("RECHAZADA");
  });

  test("despues no puede publicar proyectos, ni modificarse, ni darse de baja otra vez", async () => {
    await services.colectivoService.darDeBaja(colectivo.id);

    await expect(
      services.proyectoService.crear({
        colectivoId: colectivo.id,
        titulo: "Otro",
        descripcion: "...",
        perfiles: [datosDePerfil()],
      }),
    ).rejects.toThrow(ConflictError);
    await expect(
      services.colectivoService.actualizar(colectivo.id, { nombre: "Nuevo" }),
    ).rejects.toThrow(ConflictError);
    await expect(services.colectivoService.darDeBaja(colectivo.id)).rejects.toThrow(ConflictError);
  });
});
