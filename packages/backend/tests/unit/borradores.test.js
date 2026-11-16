import { proyecto } from "./dobles/entidades.js";
import {
  ESTADOS_PUBLICADOS,
  PROYECTO_ESTADO,
} from "../../src/domain/enums/PROYECTO_ESTADO.js";
import { MOTIVO_REVISION } from "../../src/domain/enums/MOTIVO_REVISION.js";
import { ACCION_ADMINISTRATIVA } from "../../src/domain/enums/ACCION_ADMINISTRATIVA.js";

const ahora = new Date("2026-11-15T12:00:00Z");
const despues = new Date("2026-11-16T12:00:00Z");

describe("borradores · enums", () => {
  test("los estados nuevos existen y solo ABIERTO y FINALIZADO son publicados", () => {
    expect(PROYECTO_ESTADO.BORRADOR).toBe("BORRADOR");
    expect(PROYECTO_ESTADO.EN_REVISION).toBe("EN_REVISION");
    expect(ESTADOS_PUBLICADOS).toEqual(["ABIERTO", "FINALIZADO"]);
    expect(MOTIVO_REVISION.PUBLICACION).toBe("PUBLICACION");
    expect(ACCION_ADMINISTRATIVA.PROYECTO_PUBLICADO).toBe("PROYECTO_PUBLICADO");
    expect(ACCION_ADMINISTRATIVA.PUBLICACION_RECHAZADA).toBe("PUBLICACION_RECHAZADA");
  });
});

describe("borradores · dominio del proyecto", () => {
  test("un borrador no esta publicado ni abierto, pero es editable", () => {
    const borrador = proyecto({ estado: PROYECTO_ESTADO.BORRADOR });
    expect(borrador.estaPublicado()).toBe(false);
    expect(borrador.estaAbierto()).toBe(false);
    expect(borrador.esEditable()).toBe(true);
  });

  test("en revision no esta publicado ni es editable", () => {
    const enRevision = proyecto({ estado: PROYECTO_ESTADO.EN_REVISION });
    expect(enRevision.estaPublicado()).toBe(false);
    expect(enRevision.esEditable()).toBe(false);
  });

  test("abierto es publicado y editable; finalizado es publicado y no editable", () => {
    expect(proyecto().estaPublicado()).toBe(true);
    expect(proyecto().esEditable()).toBe(true);
    const finalizado = proyecto({ estado: PROYECTO_ESTADO.FINALIZADO });
    expect(finalizado.estaPublicado()).toBe(true);
    expect(finalizado.esEditable()).toBe(false);
  });

  test("pedir la publicacion pasa a EN_REVISION y limpia un rechazo anterior", () => {
    const borrador = proyecto({
      estado: PROYECTO_ESTADO.BORRADOR,
      publicacion: { rechazo: { nota: "Falta detalle", fecha: ahora } },
    });
    borrador.pedirPublicacion("rev-1", despues);
    expect(borrador.estado).toBe(PROYECTO_ESTADO.EN_REVISION);
    expect(borrador.publicacion).toEqual({
      solicitadaEn: despues,
      revisionId: "rev-1",
      rechazo: null,
      aprobadaEn: null,
    });
  });

  test("aprobar pasa a ABIERTO con la fecha de aprobacion", () => {
    const enRevision = proyecto({
      estado: PROYECTO_ESTADO.EN_REVISION,
      publicacion: { solicitadaEn: ahora, revisionId: "rev-1", rechazo: null },
    });
    enRevision.aprobarPublicacion(despues);
    expect(enRevision.estado).toBe(PROYECTO_ESTADO.ABIERTO);
    expect(enRevision.publicacion).toMatchObject({
      revisionId: "rev-1",
      aprobadaEn: despues,
      rechazo: null,
    });
  });

  test("rechazar vuelve a BORRADOR con la nota", () => {
    const enRevision = proyecto({
      estado: PROYECTO_ESTADO.EN_REVISION,
      publicacion: { solicitadaEn: ahora, revisionId: "rev-1", rechazo: null },
    });
    enRevision.rechazarPublicacion("Sumá el alcance", despues);
    expect(enRevision.estado).toBe(PROYECTO_ESTADO.BORRADOR);
    expect(enRevision.publicacion.rechazo).toEqual({
      nota: "Sumá el alcance",
      fecha: despues,
    });
  });
});
