// Configuracion de los tests de integracion (contra un Mongo de verdad).
// `npm test` los ignora (ver "jest" en package.json); se corren con
// `npm run test:integracion`, de a uno (--runInBand) porque comparten la base.
export default {
  testMatch: ["<rootDir>/tests/integracion/**/*.test.js"],
  // Hablan con una base de verdad: mas margen que los 5 s por defecto.
  testTimeout: 20000,
};
