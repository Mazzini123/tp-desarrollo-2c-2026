import { jest } from "@jest/globals";
import { colaboracion, proyecto } from "./entidades.js";

export const sinTransacciones = { ejecutar: (operacion) => operacion() };

export function notificacionServiceEspia() {
  return { notificar: jest.fn(async () => null) };
}

export class ProyectoRepositoryEnMemoria {
  constructor(proyectos = []) {
    this.proyectos = new Map(proyectos.map((p) => [String(p.id), p]));
    this.guardar = jest.fn(async (p) => {
      this.proyectos.set(String(p.id), p);
      return p;
    });
    this.actualizarDatosDelColectivo = jest.fn(async () => {});
  }

  nuevo(datos) {
    return proyecto({ ...datos, perfiles: [] });
  }

  nuevaColaboracion(destino, datos) {
    return colaboracion({
      ...datos,
      proyectoId: destino.id,
      colectivoId: destino.colectivoId,
    });
  }

  async buscarPorId(id) {
    return this.proyectos.get(String(id)) ?? null;
  }

  async buscarPorColectivo(colectivoId) {
    return [...this.proyectos.values()].filter(
      (p) => String(p.colectivoId) === String(colectivoId),
    );
  }

  async buscarPorClaveDePublicacion() {
    return null;
  }
}

export class ColectivoRepositoryEnMemoria {
  constructor(colectivos = []) {
    this.colectivos = new Map(colectivos.map((c) => [String(c.id), c]));
    this.guardar = jest.fn(async (c) => {
      this.colectivos.set(String(c.id), c);
      return c;
    });
  }

  async buscarPorId(id) {
    return this.colectivos.get(String(id)) ?? null;
  }

  async bloquear(id) {
    return this.buscarPorId(id);
  }
}
