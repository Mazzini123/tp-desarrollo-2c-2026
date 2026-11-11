const puras = [
  "<rootDir>/tests/unit/**/*.test.js",
  "<rootDir>/tests/jobs.test.js",
  "<rootDir>/tests/middlewares/sanitizar.test.js",
];
export default {
  maxWorkers: 3,
  testTimeout: 20000,
  projects: [
    { displayName: "unit", rootDir: import.meta.dirname, testMatch: puras },
    {
      displayName: "mongo",
      rootDir: import.meta.dirname,
      globalSetup: "<rootDir>/tests/soporte/baseGlobal.js",
      globalTeardown: "<rootDir>/tests/soporte/baseGlobalFin.js",
      setupFilesAfterEnv: ["<rootDir>/tests/soporte/conexion.js"],
      testMatch: ["<rootDir>/tests/**/*.test.js"],
      testPathIgnorePatterns: [
        String.raw`[/\\]tests[/\\]unit[/\\]`,
        String.raw`[/\\]tests[/\\]jobs\.test\.js$`,
        String.raw`[/\\]tests[/\\]middlewares[/\\]sanitizar\.test\.js$`,
      ],
    },
  ],
};
