import { ROL } from "../autorizacion/enums/ROL.js";
import { ConflictError } from "../../errors/ConflictError.js";
import { NotFoundError } from "../../errors/NotFoundError.js";
import { CODIGO_ERROR } from "../../errors/CODIGO_ERROR.js";
import { mismoId } from "../../utils/ids.js";

export class LiderazgoService {
  constructor({ transacciones, contextoUsuarioRepository, contextoService }) {
    this.contextoService = contextoService;
    this.transacciones = transacciones;
    this.contextoUsuarioRepository = contextoUsuarioRepository;
  }

  destinoInvalido() {
    return new NotFoundError(
      "La persona elegida no es miembro de este colectivo",
      CODIGO_ERROR.DESTINO_INVALIDO,
    );
  }

  async transferir(contextoLider, colectivoId, contextoDestinoId) {
    if (mismoId(contextoDestinoId, contextoLider._id)) {
      throw this.destinoInvalido();
    }
    return this.transacciones.ejecutar(async () => {
      const destino = await this.contextoUsuarioRepository.buscarPorId(contextoDestinoId);
      if (
        !destino?.activo ||
        !mismoId(destino.colectivoId, colectivoId) ||
        destino.rol !== ROL.MIEMBRO
      ) {
        throw this.destinoInvalido();
      }

      const degradado = await this.contextoUsuarioRepository.cambiarRolSi(
        contextoLider._id,
        { colectivoId, rol: ROL.LIDER },
        ROL.MIEMBRO,
      );
      if (!degradado) {
        throw new ConflictError(
          "Ya no sos el lider de este colectivo",
          CODIGO_ERROR.YA_NO_ES_LIDER,
        );
      }
      await this.contextoService.bloquearActual(contextoLider);
      const ascendido = await this.contextoUsuarioRepository.cambiarRolSi(
        destino._id,
        { colectivoId, rol: ROL.MIEMBRO },
        ROL.LIDER,
      );
      if (!ascendido) throw this.destinoInvalido();
      return {
        liderAnterior: String(contextoLider._id),
        liderNuevo: String(destino._id),
      };
    });
  }
}
