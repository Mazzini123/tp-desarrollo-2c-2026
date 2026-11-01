import { mismoMedioDeContacto } from "./MedioDeContacto.js";

// Lo que una persona colaboradora SABE HACER. Los datos, sus valores por
// defecto y como se muestra hacia afuera estan en models/ColaboradorModel.js,
// que carga esta clase con loadClass.
export class Colaborador {
  tienePronombre(pronombre) {
    return this.pronombres.includes(pronombre);
  }

  tieneMedioDeContacto(medioDeContacto) {
    return this.mediosDeContacto.some((mc) => mismoMedioDeContacto(mc, medioDeContacto));
  }

  agregarMedioDeContacto(medioDeContacto) {
    this.mediosDeContacto.push(medioDeContacto);
  }

  // Compara por tipo y valor, no por identidad: el medio que llega por HTTP
  // es un objeto nuevo, distinto del que esta guardado en la lista.
  quitarMedioDeContacto(medioDeContacto) {
    this.mediosDeContacto = this.mediosDeContacto.filter(
      (mc) => !mismoMedioDeContacto(mc, medioDeContacto),
    );
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

  // Recibe la habilidad del catalogo; el schema guarda la copia (codigo y
  // titulo) en la lista de la persona.
  agregarHabilidad(habilidad) {
    if (this.tieneHabilidad(habilidad)) {
      return;
    }
    this.habilidades.push(habilidad);
  }

  quitarHabilidad(habilidad) {
    this.habilidades = this.habilidades.filter((h) => !h.equals(habilidad));
  }

  // Como se la nombra en listados publicos: su nombre de fantasia, o su
  // nombre y apellido, o su cuenta de Git (siempre tiene alguno de los tres).
  nombreParaMostrar() {
    if (this.nombreFantasia) return this.nombreFantasia;
    if (this.nombre && this.apellido) return `${this.nombre} ${this.apellido}`;
    return this.cuentaGit;
  }
}
