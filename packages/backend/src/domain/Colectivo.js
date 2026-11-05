export class Colectivo {
  estaDadoDeBaja() {
    return this.fechaBaja !== null && this.fechaBaja !== undefined;
  }

  darDeBaja(fecha) {
    this.fechaBaja = fecha;
    this.mediosDeContacto = [];
    this.redesSociales = [];
  }

  agregarProyecto(datos) {
    const proyecto = this.proyectos.create(datos);
    this.proyectos.push(proyecto);
    return proyecto;
  }

  buscarProyecto(proyectoId) {
    return this.proyectos.find((p) => p.id === String(proyectoId)) ?? null;
  }
}
