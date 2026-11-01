import { PROYECTO_ESTADO } from "./enums/PROYECTO_ESTADO.js";

// Lo que un proyecto SABE HACER. Vive embebido en el colectivo: el schema
// (proyectoSchema en models/ColectivoModel.js) carga esta clase con loadClass.
export class Proyecto {
  estaAbierto() {
    return this.estado === PROYECTO_ESTADO.ABIERTO;
  }

  finalizarProyecto(fecha = new Date()) {
    this.estado = PROYECTO_ESTADO.FINALIZADO;
    this.fechaFinalizacion = fecha;
  }

  cierreVencido(ahora) {
    return this.estaAbierto() && Boolean(this.fechaCierre) && this.fechaCierre <= ahora;
  }

  cumpleAlgunPerfil(colaborador) {
    return this.perfiles.some((perfil) => perfil.cumpleHabilidadesRequeridas(colaborador));
  }

  // Los agregar* reciben los datos y devuelven el subdocumento creado.
  agregarLogro(datos) {
    const logro = this.logros.create(datos);
    this.logros.push(logro);
    return logro;
  }

  quitarLogro(logro) {
    this.logros = this.logros.filter((l) => l.id !== logro.id);
  }

  agregarPerfil(datos) {
    const perfil = this.perfiles.create(datos);
    this.perfiles.push(perfil);
    return perfil;
  }

  quitarPerfil(perfil) {
    this.perfiles = this.perfiles.filter((existente) => existente.id !== perfil.id);
  }

  buscarPerfil(perfilId) {
    return this.perfiles.find((p) => p.id === String(perfilId)) ?? null;
  }

  yaColaboraron(colaborador) {
    return this.colaboraciones.some((c) => c.esDe(colaborador));
  }

  agregarColaboracion(datos) {
    const colaboracion = this.colaboraciones.create(datos);
    this.colaboraciones.push(colaboracion);
    return colaboracion;
  }

  buscarColaboracion(colaboracionId) {
    return this.colaboraciones.find((c) => c.id === String(colaboracionId)) ?? null;
  }

  // Las pendientes en el orden en que llegaron: se resuelven en ese orden.
  colaboracionesPendientes() {
    return this.colaboraciones.filter((c) => c.estaPendiente()).sort((a, b) => a.fecha - b.fecha);
  }

  cantidadAceptadas() {
    return this.colaboraciones.filter((c) => c.estaAceptada()).length;
  }

  tieneLimiteDeVacantes() {
    return this.limiteVacantes !== null && this.limiteVacantes !== undefined;
  }

  // El cupo se calcula, no se guarda: asi nunca queda desincronizado con las
  // colaboraciones reales.
  cupoCompleto() {
    return this.tieneLimiteDeVacantes() && this.cantidadAceptadas() >= this.limiteVacantes;
  }

  // Un getter de la clase se vuelve un VIRTUAL de Mongoose: se calcula cada
  // vez, no se guarda en la base, y aparece en la respuesta JSON. null si el
  // proyecto no tiene limite.
  get vacantesLibres() {
    if (!this.tieneLimiteDeVacantes()) {
      return null;
    }
    return Math.max(this.limiteVacantes - this.cantidadAceptadas(), 0);
  }

  aceptaPostulaciones() {
    return this.estaAbierto() && !this.cupoCompleto();
  }

  agregarAvance(datos) {
    const avance = this.avances.create(datos);
    this.avances.push(avance);
    return avance;
  }

  // El ultimo avance cargado: de ahi salen el porcentaje y los enlaces
  // vigentes del proyecto (ver el hook pre('validate') de proyectoSchema).
  ultimoAvance() {
    return this.avances.at(-1) ?? null;
  }
}
