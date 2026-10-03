import { randomUUID } from "node:crypto";

export class Avance {
    constructor({ id = randomUUID(), porcentajeConcrecion, urlSistema, urlRepositorio, fecha = new Date() }) {
        this.id = id,
        this.porcentajeConcrecion = porcentajeConcrecion,
        this.urlSistema = urlSistema,
        this.urlRepositorio = urlRepositorio,
        this.fecha = fecha;
    }
}