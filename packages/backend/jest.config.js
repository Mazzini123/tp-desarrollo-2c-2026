// Todos los tests corren contra MongoDB de verdad (lineamiento 8 del TP: sin
// mocking de la base): mongodb-memory-server arranca una instancia al
// principio y cada worker usa su propia base.
export default {
  globalSetup: "<rootDir>/tests/soporte/baseGlobal.js",
  globalTeardown: "<rootDir>/tests/soporte/baseGlobalFin.js",
  setupFilesAfterEnv: ["<rootDir>/tests/soporte/conexion.js"],
  testPathIgnorePatterns: ["/node_modules/"],
  testTimeout: 20000,
};
