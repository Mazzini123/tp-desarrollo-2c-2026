import mongoose from "mongoose";
import { MongoCatalogoRepository } from "../../src/security/persistencia/MongoCatalogoRepository.js";
import { asegurarCatalogos } from "../../src/security/catalogosSeed.js";
import { asegurarValidadores } from "../../src/security/persistencia/validadoresDeColecciones.js";

// Proveedores de identidad que usan los tests: M1 solo reconoce los que estan
// en el catalogo (proveedoresAutentificadores).
export const PROVEEDORES_DE_PRUEBA = ["prueba", "otro", "a"].map((codigo) => ({
  codigo,
  mecanismo: "OIDC_JWT",
}));

// Base vacia antes de cada test, tal como la deja el arranque de la API: los
// indices recreados (algunos son reglas: el unique del codigo de habilidad, un
// lider por colectivo), los catalogos de seguridad sembrados y los validadores
// de las colecciones instalados.
export async function vaciarBase() {
  await mongoose.connection.dropDatabase();
  await Promise.all(
    Object.values(mongoose.models).map((modelo) => modelo.createIndexes()),
  );
  const catalogoRepository = new MongoCatalogoRepository();
  await asegurarCatalogos(catalogoRepository, PROVEEDORES_DE_PRUEBA);
  await asegurarValidadores(catalogoRepository);
}
