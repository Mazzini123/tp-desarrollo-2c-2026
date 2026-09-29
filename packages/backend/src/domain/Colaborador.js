import { randomUUID } from "node:crypto";

export class Colaborador {
  constructor({
    id = randomUUID(),
    recibeMensajeriaInterna = true,
    nombreFantasia = null,
    nombre = null,
    apellido = null,
    cuentaGit = null,
    presentacion = null,
  }) {
    this.id = id;
    this.nombreFantasia = nombreFantasia;
    this.nombre = nombre;
    this.apellido = apellido;
    this.cuentaGit = cuentaGit;
    this.pronombres = [];
    this.presentacion = presentacion;
    this.habilidades = [];
    this.recibeMensajeriaInterna = recibeMensajeriaInterna;
    this.mediosDeContacto = [];
  }

  tienePronombre(pronombre) {
    return this.pronombres.includes(pronombre);
  }

  tieneMedioDeContacto(medioDeContacto) {
    return this.mediosDeContacto.some((mc) => mc.equals(medioDeContacto));
  }

  agregarMedioDeContacto(medioDeContacto) {
    this.mediosDeContacto.push(medioDeContacto);
  }

  // Compara por tipo y valor, no por identidad: el medio que llega por HTTP
  // es un objeto nuevo, distinto del que esta guardado en la lista.
  quitarMedioDeContacto(medioDeContacto) {
    this.mediosDeContacto = this.mediosDeContacto.filter((mc) => !mc.equals(medioDeContacto));
  }

  agregarPronombre(pronombre) {
    this.pronombres.push(pronombre);
  }

  quitarPronombre(pronombre) {
    this.pronombres = this.pronombres.filter((p) => p !== pronombre);
  }

  reemplazarPronombres(pronombres) {
    this.pronombres = [...new Set(pronombres)];
  }

  tieneHabilidad(habilidad) {
    return this.habilidades.some((h) => h.equals(habilidad));
  }

  agregarHabilidad(habilidad) {
    if (this.tieneHabilidad(habilidad)) {
      return;
    }
    this.habilidades.push(habilidad);
  }

  quitarHabilidad(habilidad) {
    this.habilidades = this.habilidades.filter((h) => !h.equals(habilidad));
  }

  // Lo que se ve de la persona hacia afuera. JSON.stringify (y por lo tanto
  // res.json) llama a toJSON() si existe, asi que ningun endpoint puede
  // filtrar los medios de contacto por olvido: "no se muestran de forma
  // publica en la plataforma, pero quedan registrados internamente".
  toJSON() {
    const publico = { ...this };
    delete publico.mediosDeContacto;
    return publico;
  }
}
