import {
  ACCION_ADMINISTRATIVA,
  TIPO_ENTIDAD_AUDITADA,
} from "../domain/enums/ACCION_ADMINISTRATIVA.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { siguienteVersion } from "./reglasDeTerminos.js";

const vistaPublica = ({ version, texto, publicadoEn }) => ({
  version,
  texto,
  publicadoEn,
});

export class TerminosService {
  constructor({ terminosRepository, auditoriaService, transacciones }) {
    this.terminosRepository = terminosRepository;
    this.auditoriaService = auditoriaService;
    this.transacciones = transacciones;
  }

  async vigente() {
    return this.terminosRepository.buscarVigente();
  }

  async obtenerVigente() {
    const vigente = await this.vigente();
    if (!vigente) throw new NotFoundError("Todavia no hay terminos y condiciones");
    return vistaPublica(vigente);
  }

  async publicar({ texto, actor, ahora = new Date() }) {
    return this.transacciones.ejecutar(async () => {
      const version = siguienteVersion(await this.vigente());
      const creados = await this.terminosRepository.crear({
        version,
        texto,
        publicadoEn: ahora,
        publicadoPor: actor.usuarioId,
      });
      await this.auditoriaService.registrar({
        actor,
        accion: ACCION_ADMINISTRATIVA.TERMINOS_ACTUALIZADOS,
        entidad: { tipo: TIPO_ENTIDAD_AUDITADA.TERMINOS, id: creados._id },
        detalle: { version },
      });
      return {
        ...vistaPublica(creados),
        publicadoPor: creados.publicadoPor == null ? null : String(creados.publicadoPor),
      };
    });
  }
}
