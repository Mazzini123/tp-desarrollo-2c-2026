import { TIPO_CONTEXTO } from "../security/autorizacion/enums/TIPO_CONTEXTO.js";
import { CODIGO_ERROR } from "../errors/CODIGO_ERROR.js";
import { DomainError } from "../errors/DomainError.js";
import { mismoId } from "../utils/ids.js";

export class ConflictoDeInteresesService {
  constructor({ contextoUsuarioRepository }) {
    this.contextoUsuarioRepository = contextoUsuarioRepository;
  }

  async exigirSinConflicto(usuarioId, colectivoId) {
    const contextos = await this.contextoUsuarioRepository.listarDeUsuario(usuarioId);
    const participa = contextos.some(
      (contexto) =>
        contexto.activo &&
        contexto.tipo === TIPO_CONTEXTO.COLECTIVO &&
        mismoId(contexto.colectivoId, colectivoId),
    );
    if (participa) {
      throw new DomainError(
        "Participas de ese colectivo: no podes administrar sus proyectos",
        CODIGO_ERROR.CONFLICTO_DE_INTERESES,
      );
    }
  }
}
