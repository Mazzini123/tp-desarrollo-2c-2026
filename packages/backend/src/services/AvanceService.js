import { Avance } from "../domain/Avance.js";
import { DomainError } from "../errors/DomainError.js";
import { ConflictError } from "../errors/ConflictError.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export class AvanceService {
    constructor({ colectivoRepository }) {
        this.colectivoRepository = colectivoRepository;
    }

    async registrarAvanceParaProyecto(proyectoId, datos) {
        const { colectivo, proyecto } = await this.buscarProyectoAbiertoConColectivoOrThrow(proyectoId);
        this.validarPorcentajeConcrecionParaProyecto(proyecto, datos.porcentajeConcrecion);

        const avance = new Avance({
            porcentajeConcrecion: datos.porcentajeConcrecion,
            urlSistema: datos.urlSistema,
            urlRepositorio: datos.urlRepositorio
        })

        proyecto.porcentajeConcrecion = avance.porcentajeConcrecion;
        proyecto.urlSistema = avance.urlSistema;
        proyecto.urlRepositorio = avance.urlRepositorio;
        proyecto.agregarAvance(avance);

        await this.colectivoRepository.guardar(colectivo);
        return avance;
    }

    async listarParaProyecto(proyectoId) {
        return (await this.buscarProyectoConColectivoOrThrow(proyectoId)).proyecto.avances;
    }

    async buscarPorIdParaProyecto(proyectoId, avanceId) {
        const proyecto = (await this.buscarProyectoConColectivoOrThrow(proyectoId)).proyecto;

        return this.buscarAvanceDeProyectoOrThrow(proyecto, avanceId);
    }

    buscarAvanceDeProyectoOrThrow(proyecto, avanceId) {
        const avance = proyecto.avances.find( a => a.id === avanceId );

        if (!avance) {
            throw new NotFoundError(`No existe avance con id "${avanceId}" en el proyecto con id "${proyecto.id}"`);
        }

        return avance;
    }

    async buscarProyectoAbiertoConColectivoOrThrow(proyectoId) {
        const resultado = await this.buscarProyectoConColectivoOrThrow(proyectoId);
        
        if (!resultado.proyecto.estaAbierto()) {
            throw new ConflictError(`El proyecto con id "${proyectoId}" no se encuentra abierto`);
        }
        
        return resultado;
    }

    async buscarProyectoConColectivoOrThrow(proyectoId) {
        const resultado = await this.colectivoRepository.buscarProyecto(proyectoId);
    
        if (!resultado) {
            throw new NotFoundError(`No existe un proyecto con id "${proyectoId}"`);
        }
    
        return resultado;
    }

    validarPorcentajeConcrecionParaProyecto(proyecto, porcentajeConcrecion) {
        if (proyecto.porcentajeConcrecion >= porcentajeConcrecion) {
            throw new DomainError(`El porcentaje de concrecion a registrar debe ser mayor al porcentaje de concrecion que tiene el proyecto de id "${proyecto.id}"`);
        }
    }
}