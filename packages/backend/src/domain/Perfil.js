export class Perfil {
    constructor({ descripcion, compromiso, modalidadColaboracion }) {
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
        lista = lista.filter(item => item != habilidad);
    }

    quitarHabilidadOpcional(habilidad) {
        this.quitarHabilidad(this.habilidadesOpcionales, habilidad);
    }

    quitarHabilidadRequerida(habilidad) {
        this.quitarHabilidad(this.habilidadesRequeridas, habilidad);
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