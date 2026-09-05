import { describe, it, expect } from "@jest/globals";
import { armarServicios, crearColectivoDeEjemplo } from "./testHelpers.js";
import { NotFoundError } from "../../src/errors/index.js";
import { TIPO_UBICACION } from "../../src/domain/enums/TipoUbicacion.js";

describe("ColectivoService", () => {
  it("crea un colectivo", () => {
    const { colectivoService } = armarServicios();
    const colectivo = crearColectivoDeEjemplo(colectivoService);

    expect(colectivo.id).toBeDefined();
    expect(colectivoService.listar()).toHaveLength(1);
  });

  it("crea un colectivo con ubicación", () => {
    const { colectivoService } = armarServicios();
    const colectivo = crearColectivoDeEjemplo(colectivoService, {
      ubicacion: { tipoUbicacion: TIPO_UBICACION.CABA },
    });

    expect(colectivo.ubicacion.tipoUbicacion).toBe(TIPO_UBICACION.CABA);
  });

  it("buscarPorId lanza NotFoundError si no existe", () => {
    const { colectivoService } = armarServicios();

    expect(() => colectivoService.buscarPorId("no-existe")).toThrow(NotFoundError);
  });

  it("actualizar persiste el cambio", () => {
    const { colectivoService } = armarServicios();
    const colectivo = crearColectivoDeEjemplo(colectivoService);

    colectivoService.actualizar(colectivo.id, { nombre: "Nuevo nombre" });

    expect(colectivoService.buscarPorId(colectivo.id).nombre).toBe("Nuevo nombre");
  });
});
