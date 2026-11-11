import mongoose from "mongoose";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { resumenDeProyecto } from "../../src/dto/resumenDeProyecto.js";
import { detalleDeProyecto } from "../../src/dto/detalleDeProyecto.js";

function proyectoDePrueba() {
  return new ProyectoModel({
    colectivoId: new mongoose.Types.ObjectId(),
    datosDelColectivo: { nombre: "Colectivo", tipoColectivo: "ONG" },
    titulo: "Proyecto",
    descripcion: "Descripción",
    perfiles: [
      {
        descripcion: "Desarrollo",
        compromiso: { cantidadHoras: 5, periodo: "HS_MENSUALES" },
        modalidadColaboracion: "GRATUITA",
        habilidadesRequeridas: [{ codigo: "node", titulo: "Node" }],
      },
    ],
  });
}

test("el resumen arma una respuesta sin alterar los datos ni exponer campos internos", () => {
  const documento = proyectoDePrueba();
  const datos = documento.toObject();
  const antes = documento.toObject();
  const resumen = resumenDeProyecto(datos);
  expect(datos).toEqual(antes);
  expect(resumen.id).toBe(documento.id);
  expect(resumen.perfiles[0].versionEdicion).toBe(documento.perfiles[0].versionEdicion);
  expect(resumen).not.toHaveProperty("colaboraciones");
  expect(resumen).not.toHaveProperty("_id");
  expect(resumen.perfiles[0]).not.toHaveProperty("cupoCompleto");
  expect(resumen.perfiles[0]).not.toHaveProperty("cantidadAceptadas");
  expect(resumen).not.toHaveProperty("save");
});

test("el detalle conserva el conteo global aunque solo incluya una página del historial", () => {
  const documento = proyectoDePrueba();
  const aceptadas = new Map([[documento.perfiles[0].id, 45]]);
  const detalle = detalleDeProyecto(
    documento.toObject(),
    { items: [], total: 45 },
    aceptadas,
    false,
  );
  expect(detalle.perfiles[0].cantidadAceptadas).toBe(45);
  expect(detalle.colaboraciones).toEqual([]);
  expect(detalle.colaboracionesMeta).toMatchObject({
    total: 45,
    total_pages: 3,
    privadas: false,
  });
});
