import { armarServices } from "../fixtures.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { MongoTerminosRepository } from "../../src/repositories/MongoTerminosRepository.js";
import { TerminosModel } from "../../src/models/TerminosModel.js";

describe("Integracion · terminos y condiciones", () => {
  test("la version es unica: dos publicaciones de la misma version no conviven", async () => {
    await armarServices();
    const repositorio = new MongoTerminosRepository();
    const datos = { version: 1, texto: "Uno", publicadoEn: new Date() };
    await repositorio.crear(datos);
    await expect(repositorio.crear({ ...datos, texto: "Otro" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(await TerminosModel.countDocuments()).toBe(1);
  });

  test("la vigente es la de version mas alta y las anteriores quedan como historial", async () => {
    const s = await armarServices();
    const actor = { usuarioId: null, contextoId: null };
    await s.terminosService.publicar({ texto: "Uno", actor });
    await s.terminosService.publicar({ texto: "Dos", actor });
    expect((await s.terminosService.vigente()).version).toBe(2);
    expect(await TerminosModel.countDocuments()).toBe(2);
  });
});
