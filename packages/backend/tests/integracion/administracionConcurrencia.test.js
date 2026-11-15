import mongoose from "mongoose";
import { usarBaseDeTest, armarServicesConMongo } from "./baseDeTest.js";
import { crearProyectoDePrueba } from "../fixtures.js";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { RevisionModel } from "../../src/models/RevisionModel.js";
import { AccionAdministrativaModel } from "../../src/models/AccionAdministrativaModel.js";

usarBaseDeTest();

const DIA = 86_400_000;
const actor = () => ({ usuarioId: new mongoose.Types.ObjectId(), contextoId: null });

describe("Integracion · administracion", () => {
  let services;

  beforeEach(async () => {
    services = await armarServicesConMongo();
  });

  test("dos destacados simultaneos no superan el tope", async () => {
    const hasta = new Date(Date.now() + 10 * DIA);
    const proyectos = [];
    for (let i = 0; i < 7; i++) {
      proyectos.push(
        (await crearProyectoDePrueba(services, { titulo: `p${i}` })).proyecto,
      );
    }
    for (const proyecto of proyectos.slice(0, 5)) {
      await services.destacadoService.destacar({
        proyectoId: proyecto.id,
        hasta,
        actor: actor(),
      });
    }

    const resultados = await Promise.allSettled(
      proyectos.slice(5).map((proyecto) =>
        services.destacadoService.destacar({
          proyectoId: proyecto.id,
          hasta,
          actor: actor(),
        }),
      ),
    );

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected").reason.status).toBe(409);
    expect(await ProyectoModel.countDocuments({ destacado: { $exists: true } })).toBe(6);
  });

  test("si falla la auditoria no queda el destacado", async () => {
    const { proyecto } = await crearProyectoDePrueba(services);
    services.destacadoService.auditoriaService.registrar = async () => {
      throw new Error("falla inyectada");
    };

    await expect(
      services.destacadoService.destacar({
        proyectoId: proyecto.id,
        hasta: new Date(Date.now() + DIA),
        actor: actor(),
      }),
    ).rejects.toThrow("falla inyectada");

    expect((await ProyectoModel.findById(proyecto.id)).destacado).toBeUndefined();
    expect(await AccionAdministrativaModel.countDocuments()).toBe(0);
  });

  test("si falla la auditoria no queda la revision resuelta", async () => {
    const { proyecto } = await crearProyectoDePrueba(services);
    const revision = await RevisionModel.create({
      proyectoId: proyecto.id,
      motivo: "SIN_ACTUALIZACIONES",
    });
    services.revisionService.auditoriaService.registrar = async () => {
      throw new Error("falla inyectada");
    };

    await expect(
      services.revisionService.resolver({
        revisionId: String(revision._id),
        estado: "REVISADA",
        actor: actor(),
      }),
    ).rejects.toThrow("falla inyectada");

    expect((await RevisionModel.findById(revision._id)).estado).toBe("PENDIENTE");
  });

  test("el indice parcial permite una pendiente por proyecto y motivo, y varias resueltas", async () => {
    const { proyecto } = await crearProyectoDePrueba(services);
    const nueva = (estado) =>
      RevisionModel.create({
        proyectoId: proyecto.id,
        motivo: "SIN_ACTUALIZACIONES",
        estado,
      });

    await nueva("PENDIENTE");
    await expect(nueva("PENDIENTE")).rejects.toMatchObject({ code: 11000 });
    await nueva("REVISADA");
    await nueva("DESCARTADA");
    expect(await RevisionModel.countDocuments({ proyectoId: proyecto.id })).toBe(3);
  });
});
