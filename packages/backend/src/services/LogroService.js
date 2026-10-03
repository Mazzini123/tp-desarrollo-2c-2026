import { Logro } from "../domain/Logro.js"
import { ConflictError } from "../errors/ConflictError.js";
import { DomainError } from "../errors/DomainError.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export class LogroService {
    constructor({ colectivoRepository }) {
        this.colectivoRepository = colectivoRepository;
    }

    async crearParaProyecto(proyectoId, datos) {
        const { colectivo, proyecto } = await this.buscarProyectoAbiertoConColectivoOrThrow(proyectoId);
        this.validarTituloLogroParaProyecto(datos.titulo, proyecto);

        const logro = new Logro({
            titulo: datos.titulo,
            descripcion: datos.descripcion
        });

        proyecto.agregarLogro(logro);
        await this.colectivoRepository.guardar(colectivo);
        return logro;
    }

    async conseguirTodosDeProyecto(proyectoId) {
        return (await this.buscarProyectoConColectivoOrThrow(proyectoId)).proyecto.logros
    }

    async conseguirPorIdParaProyecto(proyectoId, logroId) {
        const proyecto = (await this.buscarProyectoConColectivoOrThrow(proyectoId)).proyecto;

        return this.buscarLogroDeProyectoOrThrow(proyecto, logroId);
    }

    async actualizarParaProyecto(proyectoId, logroId, { titulo, descripcion }) {
        if (!titulo) {
            throw new DomainError(`El titulo del logro es obligatorio`);
        }

        if (!descripcion) {
            throw new DomainError(`La descripcion del logro es obligatoria`);
        }

        const { colectivo, proyecto } = await this.buscarProyectoAbiertoConColectivoOrThrow(proyectoId);
        this.validarTituloLogroParaProyecto(titulo, proyecto, logroId);

        const logro = this.buscarLogroDeProyectoOrThrow(proyecto, logroId);

        logro.titulo = titulo;
        logro.descripcion = descripcion;

        await this.colectivoRepository.guardar(colectivo);
        return logro;
    }

    validarTituloLogroParaProyecto(tituloLogro, proyecto, logroId = null) {
        if (proyecto.logros.some(
            l => l.titulo === tituloLogro && l.id !== logroId
        )) {
            throw new ConflictError(
                `El proyecto con id "${proyecto.id}" ya contiene un logro con mismo titulo`
            );
        }
    }

    async eliminarParaProyecto(proyectoId, logroId) {
        const { colectivo, proyecto } = await this.buscarProyectoAbiertoConColectivoOrThrow(proyectoId);

        const logro = this.buscarLogroDeProyectoOrThrow(proyecto, logroId);
        proyecto.logros = proyecto.logros.filter(l => l.id !== logro.id);

        await this.colectivoRepository.guardar(colectivo);
    }

    buscarLogroDeProyectoOrThrow(proyecto, logroId) {
        const logro = proyecto.logros.find( l => l.id === logroId );

        if (!logro) {
            throw new NotFoundError(`No existe un logro con id "${logroId}" en el proyecto con id "${proyecto.id}"`);
        }

        return logro;
    }

    async buscarProyectoConColectivoOrThrow(proyectoId) {
        const resultado = await this.colectivoRepository.buscarProyecto(proyectoId);

        if (!resultado) {
            throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
        }

        return resultado;
    }

    async buscarProyectoAbiertoConColectivoOrThrow(proyectoId) {
        const resultado = await this.buscarProyectoConColectivoOrThrow(proyectoId);

        if (!resultado.proyecto.estaAbierto()) {
            throw new ConflictError(`El proyecto con id "${proyectoId}" no se encuentra abierto`);
        }

        return resultado;
    }
}