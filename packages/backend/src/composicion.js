import { InMemoryRepository } from "./repositories/InMemoryRepository.js";
import { InMemoryColectivoRepository } from "./repositories/InMemoryColectivoRepository.js";
import { InMemoryHabilidadRepository } from "./repositories/InMemoryHabilidadRepository.js";

import { ColectivoService } from "./services/ColectivoService.js";
import { ProyectoService } from "./services/ProyectoService.js";
import { HabilidadService } from "./services/HabilidadService.js";
import { ColaboradorService } from "./services/ColaboradorService.js";
import { ColaboracionService } from "./services/ColaboracionService.js";

import { ColectivoController } from "./controllers/ColectivoController.js";
import { ProyectoController } from "./controllers/ProyectoController.js";
import { HabilidadController } from "./controllers/HabilidadController.js";
import { ColaboradorController } from "./controllers/ColaboradorController.js";

/**
 * Raiz de composicion: el UNICO lugar del proyecto donde se elige una
 * implementacion concreta. Reemplaza a `services/index.js`, que exportaba
 * instancias sueltas y era el singleton global del que colgaban los defaults
 * de los constructores.
 *
 * Correccion B1 del coloquio: "si decidiste que en la construccion vas a usar
 * inyeccion de dependencias, los defaults no los pones en el constructor y
 * listo: que te los pasen". Ahora ningun controller ni service importa de aca:
 * las dependencias entran solo por constructor.
 *
 * En la segunda entrega, cambiar de memoria a MongoDB es cambiar las tres
 * primeras lineas de esta funcion. Ningun service se entera (correccion D2).
 */
export function componerApp() {
  const colectivoRepository = new InMemoryColectivoRepository();
  // Correccion D1: era `new InMemoryColaboradorRepository()`, una subclase sin
  // un solo metodo propio. El generico alcanza.
  const colaboradorRepository = new InMemoryRepository();
  const habilidadRepository = new InMemoryHabilidadRepository();

  const habilidadService = new HabilidadService({ habilidadRepository });

  const colectivoService = new ColectivoService({ colectivoRepository });

  const proyectoService = new ProyectoService({
    colectivoRepository,
    colectivoService,
    habilidadService,
  });

  const colaboradorService = new ColaboradorService({
    colaboradorRepository,
    habilidadService,
  });

  const colaboracionService = new ColaboracionService({
    colectivoRepository,
    proyectoService,
    colaboradorService,
  });

  const controllers = {
    colectivo: new ColectivoController({ colectivoService, proyectoService }),
    proyecto: new ProyectoController({ proyectoService, colaboracionService }),
    habilidad: new HabilidadController({ habilidadService }),
    colaborador: new ColaboradorController({ colaboradorService, colaboracionService }),
  };

  const services = {
    colectivoService,
    proyectoService,
    habilidadService,
    colaboradorService,
    colaboracionService,
  };

  return { controllers, services };
}
