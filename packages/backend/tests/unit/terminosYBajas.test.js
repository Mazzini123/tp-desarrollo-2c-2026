import { jest } from "@jest/globals";
import { colectivo, perfil, proyecto, colaboracion } from "./dobles/entidades.js";
import { ProyectoRepositoryEnMemoria, sinTransacciones } from "./dobles/repositorios.js";
import {
  ESTADOS_PUBLICADOS,
  PROYECTO_ESTADO,
} from "../../src/domain/enums/PROYECTO_ESTADO.js";
import {
  ACCION_ADMINISTRATIVA,
  TIPO_ENTIDAD_AUDITADA,
} from "../../src/domain/enums/ACCION_ADMINISTRATIVA.js";
import { COLABORACION_ESTADO } from "../../src/domain/enums/COLABORACION_ESTADO.js";
import { CODIGO_ERROR } from "../../src/errors/CODIGO_ERROR.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";
import { verificarEditable } from "../../src/services/reglasDePublicacion.js";
import { darDeBajaProyecto } from "../../src/services/reglasDePostulacion.js";
import {
  aceptacionDeTerminos,
  siguienteVersion,
} from "../../src/services/reglasDeTerminos.js";
import { TerminosService } from "../../src/services/TerminosService.js";
import { ProyectoService } from "../../src/services/ProyectoService.js";

const ahora = new Date("2026-11-16T12:00:00Z");
const vigente = { _id: "t2", version: 2, texto: "Reglas", publicadoEn: ahora };

describe("terminos y bajas · enums", () => {
  test("DADO_DE_BAJA existe y no es un estado publicado", () => {
    expect(PROYECTO_ESTADO.DADO_DE_BAJA).toBe("DADO_DE_BAJA");
    expect(ESTADOS_PUBLICADOS).toEqual(["ABIERTO", "FINALIZADO"]);
  });

  test("la auditoria conoce las acciones y entidades nuevas", () => {
    expect(ACCION_ADMINISTRATIVA.TERMINOS_ACTUALIZADOS).toBe("TERMINOS_ACTUALIZADOS");
    expect(ACCION_ADMINISTRATIVA.PROYECTO_DADO_DE_BAJA).toBe("PROYECTO_DADO_DE_BAJA");
    expect(ACCION_ADMINISTRATIVA.COLECTIVO_DADO_DE_BAJA).toBe("COLECTIVO_DADO_DE_BAJA");
    expect(TIPO_ENTIDAD_AUDITADA.COLECTIVO).toBe("COLECTIVO");
    expect(TIPO_ENTIDAD_AUDITADA.TERMINOS).toBe("TERMINOS");
    expect(CODIGO_ERROR.TERMINOS_NO_ACEPTADOS).toBe("TERMINOS_NO_ACEPTADOS");
  });
});

describe("terminos y bajas · dominio del proyecto", () => {
  test("dar de baja un proyecto abierto guarda el motivo y lo saca de lo publicado", () => {
    const abierto = proyecto();
    abierto.darDeBaja("Infringe los terminos", ahora);
    expect(abierto.estado).toBe(PROYECTO_ESTADO.DADO_DE_BAJA);
    expect(abierto.baja).toEqual({ motivo: "Infringe los terminos", fecha: ahora });
    expect(abierto.estaDadoDeBaja()).toBe(true);
    expect(abierto.estaPublicado()).toBe(false);
    expect(abierto.esEditable()).toBe(false);
  });

  test("al darlo de baja rechaza las postulaciones pendientes y finaliza las aceptadas", () => {
    const pendiente = colaboracion();
    const aceptada = colaboracion({ estado: COLABORACION_ESTADO.ACEPTADA });
    const abierto = proyecto({ colaboraciones: [pendiente, aceptada] });
    const cambios = darDeBajaProyecto(abierto, "Spam", ahora);
    expect(abierto.estado).toBe(PROYECTO_ESTADO.DADO_DE_BAJA);
    expect(pendiente.estado).toBe(COLABORACION_ESTADO.RECHAZADA);
    expect(aceptada.estado).toBe(COLABORACION_ESTADO.FINALIZADA);
    expect(cambios.rechazadas).toEqual([pendiente]);
    expect(cambios.finalizadas).toEqual([aceptada]);
  });

  test("un proyecto dado de baja no se edita (409)", () => {
    const dadoDeBaja = proyecto({ estado: PROYECTO_ESTADO.DADO_DE_BAJA });
    expect(() => verificarEditable(dadoDeBaja, "modificar")).toThrow(ConflictError);
  });
});

describe("terminos y bajas · reglas de terminos", () => {
  test("sin terminos publicados no se exige nada", () => {
    expect(aceptacionDeTerminos(null, undefined, ahora)).toBeNull();
    expect(aceptacionDeTerminos(null, 3, ahora)).toBeNull();
  });

  test("con terminos vigentes, falta la version o no coincide: 422 TERMINOS_NO_ACEPTADOS", () => {
    for (const aceptada of [undefined, 1, 3]) {
      let error;
      try {
        aceptacionDeTerminos(vigente, aceptada, ahora);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(DomainError);
      expect(error.codigo).toBe("TERMINOS_NO_ACEPTADOS");
      expect(error.detalle).toEqual({ versionVigente: 2 });
    }
  });

  test("con la version vigente devuelve la aceptacion", () => {
    expect(aceptacionDeTerminos(vigente, 2, ahora)).toEqual({
      version: 2,
      aceptadosEn: ahora,
    });
  });

  test("la version sube de a uno y arranca en 1", () => {
    expect(siguienteVersion(null)).toBe(1);
    expect(siguienteVersion(vigente)).toBe(3);
  });
});

function terminosEnMemoria() {
  const versiones = [];
  return {
    versiones,
    buscarVigente: jest.fn(async () => versiones.at(-1) ?? null),
    crear: jest.fn(async (datos) => {
      const creado = { _id: `t${datos.version}`, ...datos };
      versiones.push(creado);
      return creado;
    }),
  };
}

describe("terminos y bajas · TerminosService", () => {
  const actor = { usuarioId: "u1", contextoId: "c1" };

  function armar() {
    const terminosRepository = terminosEnMemoria();
    const auditoriaService = { registrar: jest.fn(async () => {}) };
    const service = new TerminosService({
      terminosRepository,
      auditoriaService,
      transacciones: sinTransacciones,
    });
    return { service, terminosRepository, auditoriaService };
  }

  test("sin terminos, vigente es null y obtenerVigente da 404", async () => {
    const { service } = armar();
    expect(await service.vigente()).toBeNull();
    await expect(service.obtenerVigente()).rejects.toBeInstanceOf(NotFoundError);
  });

  test("publicar crea la version siguiente y la audita", async () => {
    const { service, auditoriaService } = armar();
    const primera = await service.publicar({ texto: "Uno", actor, ahora });
    const segunda = await service.publicar({ texto: "Dos", actor, ahora });
    expect(primera).toEqual({
      version: 1,
      texto: "Uno",
      publicadoEn: ahora,
      publicadoPor: "u1",
    });
    expect(segunda.version).toBe(2);
    expect(await service.obtenerVigente()).toEqual({
      version: 2,
      texto: "Dos",
      publicadoEn: ahora,
    });
    expect(auditoriaService.registrar).toHaveBeenLastCalledWith({
      actor,
      accion: "TERMINOS_ACTUALIZADOS",
      entidad: { tipo: "TERMINOS", id: "t2" },
      detalle: { version: 2 },
    });
  });
});

describe("terminos y bajas · alta de proyectos", () => {
  function armar(vigenteActual) {
    const proyectoRepository = new ProyectoRepositoryEnMemoria();
    const dueno = colectivo();
    const service = new ProyectoService({
      proyectoRepository,
      colaboracionRepository: {},
      colectivoService: { buscarPorId: async () => dueno },
      perfilService: { construirPerfil: async (datos) => perfil(datos) },
      notificacionService: {},
      avisoAutomaticoService: { avisarPorProyectoNuevo: jest.fn(async () => {}) },
      terminosService: { vigente: async () => vigenteActual },
      transacciones: sinTransacciones,
    });
    const crear = (cambios = {}) =>
      service.crear(
        {
          colectivoId: dueno.id,
          titulo: "Sitio",
          descripcion: "d",
          perfiles: [{ descripcion: "Backend" }],
          ...cambios,
        },
        ahora,
      );
    return { crear, proyectoRepository };
  }

  test("sin terminos publicados se crea como hoy y no guarda terminos", async () => {
    const { crear } = armar(null);
    const creado = await crear();
    expect(creado.terminos).toBeUndefined();
  });

  test("con terminos vigentes y sin aceptarlos da 422 y no guarda nada", async () => {
    const { crear, proyectoRepository } = armar(vigente);
    for (const cambios of [{}, { terminosAceptados: 1 }, { borrador: true }]) {
      const error = await crear(cambios).catch((e) => e);
      expect(error.codigo).toBe("TERMINOS_NO_ACEPTADOS");
    }
    expect(proyectoRepository.guardar).not.toHaveBeenCalled();
  });

  test("aceptando la version vigente guarda la aceptacion, tambien en borradores", async () => {
    const { crear } = armar(vigente);
    for (const borrador of [false, true]) {
      const creado = await crear({ terminosAceptados: 2, borrador });
      expect(creado.terminos).toEqual({ version: 2, aceptadosEn: ahora });
    }
  });
});
