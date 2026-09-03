import { describe, it, expect } from "@jest/globals";
import { armarServicios, crearColectivoDeEjemplo } from "./testHelpers.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";
import { NivelUbicacion } from "../../src/domain/enums/NivelUbicacion.js";

describe("ColectivoService", () => {
  it("crea un colectivo sin ubicación", () => {
    const { colectivoService } = armarServicios();

    const colectivo = crearColectivoDeEjemplo(colectivoService);

    expect(colectivo.id).toBeDefined();
    expect(colectivoService.listar()).toHaveLength(1);
  });

  it("crea un colectivo con ubicación", () => {
    const { colectivoService } = armarServicios();

    const colectivo = crearColectivoDeEjemplo(colectivoService, {
      ubicacion: { nivel: NivelUbicacion.CABA },
    });

    expect(colectivo.ubicacion.nivel).toBe(NivelUbicacion.CABA);
  });

  it("buscarPorId lanza NotFoundError si no existe", () => {
    const { colectivoService } = armarServicios();

    expect(() => colectivoService.buscarPorId("no-existe")).toThrow(NotFoundError);
  });

  it("actualizar modifica los datos y los persiste", () => {
    const { colectivoService } = armarServicios();
    const colectivo = crearColectivoDeEjemplo(colectivoService);

    const actualizado = colectivoService.actualizar(colectivo.id, {
      nombre: "Nuevo nombre",
    });

    expect(actualizado.nombre).toBe("Nuevo nombre");
    expect(colectivoService.buscarPorId(colectivo.id).nombre).toBe("Nuevo nombre");
  });
});
