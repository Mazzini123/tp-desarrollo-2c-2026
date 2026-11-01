// Colectivo es el agregado raiz: sus proyectos (y adentro, perfiles,
// colaboraciones, logros y avances) viven embebidos en su documento.
//
// Esta clase dice lo que el colectivo SABE HACER. Los datos, sus valores por
// defecto y como se guardan estan en models/ColectivoModel.js, que la carga
// con loadClass.
export class Colectivo {
  estaDadoDeBaja() {
    return this.fechaBaja !== null && this.fechaBaja !== undefined;
  }

  // Requerimiento adicional 23: "La informacion historica del colectivo no se
  // elimina, pero ya se eliminan de la plataforma todos sus datos de
  // contacto".
  darDeBaja(fecha) {
    this.fechaBaja = fecha;
    this.mediosDeContacto = [];
    this.redesSociales = [];
  }

  // Recibe los datos y devuelve el proyecto ya creado como subdocumento: un
  // proyecto no existe fuera de su colectivo.
  agregarProyecto(datos) {
    const proyecto = this.proyectos.create(datos);
    this.proyectos.push(proyecto);
    return proyecto;
  }

  buscarProyecto(proyectoId) {
    return this.proyectos.find((p) => p.id === String(proyectoId)) ?? null;
  }
}
