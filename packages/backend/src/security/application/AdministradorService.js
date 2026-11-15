import { TIPO_CONTEXTO } from "../autorizacion/enums/TIPO_CONTEXTO.js";
import { ROL } from "../autorizacion/enums/ROL.js";
import {
  ACCION_ADMINISTRATIVA,
  TIPO_ENTIDAD_AUDITADA,
} from "../../domain/enums/ACCION_ADMINISTRATIVA.js";

export class AdministradorService {
  constructor({
    transacciones,
    contextoUsuarioRepository,
    usuarioRepository,
    auditoriaService,
  }) {
    this.transacciones = transacciones;
    this.contextoUsuarioRepository = contextoUsuarioRepository;
    this.usuarioRepository = usuarioRepository;
    this.auditoriaService = auditoriaService;
  }

  async otorgar({ usuarioId, actor = null }) {
    return this.transacciones.ejecutar(async () => {
      await this.usuarioRepository.bloquear(usuarioId);
      const yaEsAdministrador = await this.contextoUsuarioRepository.existeActivoDeTipo(
        usuarioId,
        TIPO_CONTEXTO.ADMINISTRACION,
      );
      if (yaEsAdministrador) return { creado: false };

      const contexto = await this.contextoUsuarioRepository.crear({
        usuarioId,
        tipo: TIPO_CONTEXTO.ADMINISTRACION,
        rol: ROL.ADMIN,
      });
      await this.auditoriaService.registrar({
        actor,
        accion: ACCION_ADMINISTRATIVA.ADMIN_OTORGADO,
        entidad: { tipo: TIPO_ENTIDAD_AUDITADA.USUARIO, id: usuarioId },
        detalle: actor ? {} : { origen: "COMANDO" },
      });
      return { creado: true, contextoId: contexto.id };
    });
  }
}
