import { randomUUID } from "node:crypto";

export class Perfil {
    constructor({ id = randomUUID(), descripcion, compromiso, modalidadColaboracion }) {
        this.id = id;
        this.habilidadesRequeridas = [];
        this.habilidadesOpcionales = [];
        this.descripcion = descripcion;
        this.compromiso = compromiso;
        this.modalidadColaboracion = modalidadColaboracion;
    }

    agregarHabilidad(lista, habilidad) {
        lista.push(habilidad);
    }

    agregarHabilidadOpcional(habilidad) {
        this.agregarHabilidad(this.habilidadesOpcionales, habilidad);
    }

    agregarHabilidadRequerida(habilidad) {
        this.agregarHabilidad(this.habilidadesRequeridas, habilidad);
    }

    quitarHabilidad(lista, habilidad) {
        return lista.filter((item) => !item.equals(habilidad));
    }

    quitarHabilidadOpcional(habilidad) {
        this.habilidadesOpcionales = this.quitarHabilidad(this.habilidadesOpcionales, habilidad);
    }

    quitarHabilidadRequerida(habilidad) {
        this.habilidadesRequeridas = this.quitarHabilidad(this.habilidadesRequeridas, habilidad);
    }

    cumpleAlgunaHabilidad(lista, colaborador) {
        return lista.some((h) => colaborador.tieneHabilidad(h));
    }

    cumpleAlgunaHabilidadRequerida(colaborador) {
        return this.cumpleAlgunaHabilidad(this.habilidadesRequeridas, colaborador);
    }

    cumpleAlgunaHabilidadOpcional(colaborador) {
        return this.cumpleAlgunaHabilidad(this.habilidadesOpcionales, colaborador);
    }
}
