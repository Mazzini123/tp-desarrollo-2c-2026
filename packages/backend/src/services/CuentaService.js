import { ROL_CUENTA } from "../domain/enums/ROL_CUENTA.js";

export class CuentaService {
  constructor({ colectivoRepository, colaboradorRepository }) {
    this.colectivoRepository = colectivoRepository;
    this.colaboradorRepository = colaboradorRepository;
  }

  async resolver(cuentaId) {
    const colectivo = await this.colectivoRepository.buscarPorCuenta(cuentaId);
    if (colectivo) {
      return { rol: ROL_CUENTA.COLECTIVO, perfilId: colectivo.id };
    }

    const colaboradora = await this.colaboradorRepository.buscarPorCuenta(cuentaId);
    if (colaboradora) {
      return { rol: ROL_CUENTA.COLABORADORA, perfilId: colaboradora.id };
    }

    return { rol: null, perfilId: null };
  }
}
