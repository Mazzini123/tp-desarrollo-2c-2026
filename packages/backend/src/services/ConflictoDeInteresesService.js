import { TIPO_CONTEXTO } from "../security/autorizacion/enums/TIPO_CONTEXTO.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";
import { DomainError } from "../errors/DomainError.js";

export class ConflictoDeInteresesService {
  constructor({ contextoUsuarioRepository }) {
    this.contextoUsuarioRepository = contextoUsuarioRepository;
  }

  async colectivosDe(usuarioId) {
    const contextos = await this.contextoUsuarioRepository.listarDeUsuario(usuarioId);
    return new Set(
      contextos
        .filter(
          (contexto) => contexto.activo && contexto.tipo === TIPO_CONTEXTO.COLECTIVO,
        )
        .map((contexto) => String(contexto.colectivoId)),
    );
  }

  async exigirSinConflicto(usuarioId, colectivoId) {
    const propios = await this.colectivosDe(usuarioId);
    if (propios.has(String(colectivoId))) {
      throw new DomainError(
        "Participas de ese colectivo: no podes administrar sus proyectos",
        CODIGO_ERROR.CONFLICTO_DE_INTERESES,
      );
    }
  }
}
