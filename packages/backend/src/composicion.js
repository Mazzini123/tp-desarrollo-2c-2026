import { InMemoryRepository } from "./repositories/InMemoryRepository.js";
import { InMemoryColectivoRepository } from "./repositories/InMemoryColectivoRepository.js";
import { InMemoryHabilidadRepository } from "./repositories/InMemoryHabilidadRepository.js";
import { MongoHabilidadRepository } from "./repositories/MongoHabilidadRepository.js";

import { ColectivoService } from "./services/ColectivoService.js";
import { ProyectoService } from "./services/ProyectoService.js";
import { PerfilService } from "./services/PerfilService.js";
import { HabilidadService } from "./services/HabilidadService.js";
import { ColaboradorService } from "./services/ColaboradorService.js";
import { ColaboracionService } from "./services/ColaboracionService.js";

import { ColectivoController } from "./controllers/ColectivoController.js";
import { ProyectoController } from "./controllers/ProyectoController.js";
import { PerfilController } from "./controllers/PerfilController.js";
import { HabilidadController } from "./controllers/HabilidadController.js";
import { ColaboradorController } from "./controllers/ColaboradorController.js";

export function componerApp() {
  const colectivoRepository = new InMemoryColectivoRepository();
  const colaboradorRepository = new InMemoryRepository();
  const habilidadRepository = new MongoHabilidadRepository();

  const habilidadService = new HabilidadService({ habilidadRepository });

  const colectivoService = new ColectivoService({ colectivoRepository });

  const perfilService = new PerfilService({
    colectivoRepository,
    habilidadService,
  });

  const proyectoService = new ProyectoService({
    colectivoRepository,
    colectivoService,
    perfilService,
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
    perfil: new PerfilController({ perfilService }),
    habilidad: new HabilidadController({ habilidadService }),
    colaborador: new ColaboradorController({ colaboradorService, colaboracionService }),
  };

  const services = {
    colectivoService,
    proyectoService,
    perfilService,
    habilidadService,
    colaboradorService,
    colaboracionService,
  };

  return { controllers, services };
}
