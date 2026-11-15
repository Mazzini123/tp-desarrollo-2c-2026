import { IdentidadExternaModel } from "./IdentidadExternaModel.js";
import { DuplicadoError } from "../../errors/DuplicadoError.js";

export class MongoIdentidadExternaRepository {
  constructor({ catalogoRepository }) {
    this.catalogoRepository = catalogoRepository;
  }

  async buscar(proveedor, identificadorExterno) {
    const proveedorId = await this.catalogoRepository.idDeProveedor(proveedor);
    return proveedorId
      ? IdentidadExternaModel.findOne({ proveedorId, identificadorExterno })
      : null;
  }

  async crear({ proveedor, identificadorExterno }) {
    const proveedorId = await this.catalogoRepository.idDeProveedor(proveedor);
    if (!proveedorId) {
      throw new Error(`El proveedor "${proveedor}" no esta en el catalogo`);
    }
    try {
      return await IdentidadExternaModel.create({ proveedorId, identificadorExterno });
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicadoError("La identidad externa ya existe");
      }
      throw error;
    }
  }
}
