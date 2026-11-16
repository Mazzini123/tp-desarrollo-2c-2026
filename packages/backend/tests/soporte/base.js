import mongoose from "mongoose";
import { MongoCatalogoRepository } from "../../src/security/persistencia/MongoCatalogoRepository.js";
import { asegurarCatalogos } from "../../src/security/catalogosSeed.js";
import { asegurarValidadores } from "../../src/security/persistencia/validadoresDeColecciones.js";

export const PROVEEDORES_DE_PRUEBA = ["prueba", "otro", "a"].map((codigo) => ({
  codigo,
  mecanismo: "OIDC_JWT",
}));

export async function vaciarBase() {
  await mongoose.connection.dropDatabase();
  await Promise.all(
    Object.values(mongoose.models).map((modelo) => modelo.createIndexes()),
  );
  const catalogoRepository = new MongoCatalogoRepository();
  await asegurarCatalogos(catalogoRepository, PROVEEDORES_DE_PRUEBA);
  await asegurarValidadores(catalogoRepository);
}
