import { PersonaColaboradora } from "../domain/PersonaColaboradora.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export class PersonaColaboradoraService {
  #personaColaboradoraRepository;
  #habilidadService;

  constructor({ personaColaboradoraRepository, habilidadService }) {
    this.#personaColaboradoraRepository = personaColaboradoraRepository;
    this.#habilidadService = habilidadService;
  }

  crear({
    nombreDeFantasia,
    cuentaDeDesarrollo,
    nombre,
    apellido,
    pronombres,
    presentacion,
    datosDeContacto,
    habilidades,
  }) {
    const persona = new PersonaColaboradora({
      nombreDeFantasia,
      cuentaDeDesarrollo,
      nombre,
      apellido,
      pronombres,
      presentacion,
      datosDeContacto,
    });

    if (habilidades && habilidades.length > 0) {
      const habilidadesResueltas = this.#habilidadService.resolverPorCodigos(habilidades);
      habilidadesResueltas.forEach((h) => persona.agregarHabilidad(h));
    }

    return this.#personaColaboradoraRepository.guardar(persona);
  }

  listar() {
    return this.#personaColaboradoraRepository.listar();
  }

  buscarPorId(id) {
    const persona = this.#personaColaboradoraRepository.buscarPorId(id);
    if (!persona) {
      throw new NotFoundError(`No existe una persona colaboradora con id "${id}"`);
    }
    return persona;
  }

  actualizar(id, { pronombres, presentacion, datosDeContacto }) {
    const persona = this.buscarPorId(id);
    persona.actualizarDatos({ pronombres, presentacion, datosDeContacto });
    return this.#personaColaboradoraRepository.guardar(persona);
  }

  agregarHabilidad(id, codigoHabilidad) {
    const persona = this.buscarPorId(id);
    const [habilidad] = this.#habilidadService.resolverPorCodigos([codigoHabilidad]);

    persona.agregarHabilidad(habilidad);
    return this.#personaColaboradoraRepository.guardar(persona);
  }

  quitarHabilidad(id, codigoHabilidad) {
    const persona = this.buscarPorId(id);
    const [habilidad] = this.#habilidadService.resolverPorCodigos([codigoHabilidad]);

    persona.quitarHabilidad(habilidad);
    return this.#personaColaboradoraRepository.guardar(persona);
  }
}
