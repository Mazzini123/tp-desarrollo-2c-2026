import { BaseController } from "./BaseController.js";
import { UnauthorizedError } from "../errors/UnauthorizedError.js";

export class CuentaController extends BaseController {
  yo = async (req, res) => {
    if (!req.identidad) {
      throw new UnauthorizedError("La autenticacion no esta habilitada o falta la sesion");
    }

    const { rol, perfilId } = req.cuenta;
    res.status(200).json({ id: req.identidad.sub, rol, perfilId });
  };
}
