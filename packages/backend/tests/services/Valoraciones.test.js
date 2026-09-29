import { armarServices, crearColectivoDePrueba, datosDePerfil, CODIGOS } from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";

// Requerimiento adicional 39: valoraciones mutuas.
describe("Valoraciones mutuas", () => {
  let services;
  let colectivo;
  let proyecto;
  let ada;

  beforeEach(async () => {
    services = await armarServices();
    colectivo = await crearColectivoDePrueba(services.colectivoService);
    proyecto = await services.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo: "Sitio",
      descripcion: "...",
      perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
    });
    ada = await services.colaboradorService.crear({
      cuentaGit: "ada",
      codigosHabilidades: [CODIGOS.node],
    });
  });

  const anotar = (datos = {}) =>
    services.colaboracionService.registrar({
      proyectoId: proyecto.id,
      colaboradorId: ada.id,
      ...datos,
    });

  const valorar = (colaboracion, datos) =>
    services.colaboracionService.valorar(proyecto.id, colaboracion.id, datos);

  test("mientras la colaboracion sigue en curso no se puede valorar", async () => {
    const colaboracion = await anotar();
    await expect(valorar(colaboracion, { autor: "COLECTIVO", puntaje: 5 })).rejects.toThrow(
      ConflictError,
    );
  });

  test("finalizar el proyecto finaliza las colaboraciones en curso", async () => {
    const colaboracion = await anotar();
    await services.proyectoService.finalizar(proyecto.id);

    expect(colaboracion.estado).toBe("FINALIZADA");
    expect(colaboracion.fechaFin).toBeInstanceOf(Date);
    const bandeja = await services.notificacionService.listar(ada.id);
    expect(bandeja.items[0].tipo).toBe("COLABORACION_FINALIZADA");
  });

  test("cada parte valora una vez y se ve en el historial de la otra", async () => {
    const colaboracion = await anotar();
    await services.colaboracionService.finalizar(proyecto.id, colaboracion.id);

    await valorar(colaboracion, { autor: "COLECTIVO", puntaje: 5, comentario: "Genia" });
    await valorar(colaboracion, { autor: "COLABORADOR", puntaje: 4 });
    await expect(valorar(colaboracion, { autor: "COLECTIVO", puntaje: 1 })).rejects.toThrow(
      ConflictError,
    );

    const deAda = await services.colaboracionService.listarValoracionesDeColaborador(ada.id);
    expect(deAda).toMatchObject({ cantidad: 1, promedio: 5 });
    expect(deAda.valoraciones[0]).toMatchObject({
      comentario: "Genia",
      colectivo: { id: colectivo.id },
    });

    const delColectivo = await services.colaboracionService.listarValoracionesDeColectivo(
      colectivo.id,
    );
    expect(delColectivo).toMatchObject({ cantidad: 1, promedio: 4 });
    expect(delColectivo.valoraciones[0].autor.id).toBe(ada.id);
  });

  test("en una colaboracion anonima nadie sabe quien fue", async () => {
    const colaboracion = await anotar({ esPublica: false });
    await services.colaboracionService.finalizar(proyecto.id, colaboracion.id);
    await valorar(colaboracion, { autor: "COLECTIVO", puntaje: 5 });
    await valorar(colaboracion, { autor: "COLABORADOR", puntaje: 3 });

    const deAda = await services.colaboracionService.listarValoracionesDeColaborador(ada.id);
    expect(deAda.cantidad).toBe(0);

    const delColectivo = await services.colaboracionService.listarValoracionesDeColectivo(
      colectivo.id,
    );
    expect(delColectivo.valoraciones[0].autor).toBeNull();
    expect(delColectivo.valoraciones[0].puntaje).toBe(3);
  });

  test("solo se finaliza una colaboracion aceptada", async () => {
    const colaboracion = await anotar();
    await services.colaboracionService.finalizar(proyecto.id, colaboracion.id);
    await expect(
      services.colaboracionService.finalizar(proyecto.id, colaboracion.id),
    ).rejects.toThrow(ConflictError);
  });

  test("el puntaje va de 1 a 5", async () => {
    const colaboracion = await anotar();
    await services.colaboracionService.finalizar(proyecto.id, colaboracion.id);
    await expect(valorar(colaboracion, { autor: "COLECTIVO", puntaje: 6 })).rejects.toThrow(
      DomainError,
    );
  });
});
