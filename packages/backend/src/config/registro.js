const SALIDAS = { info: "log", aviso: "warn", error: "error" };

function escribir(nivel, evento, datos = {}) {
  console[SALIDAS[nivel]](
    JSON.stringify({ fecha: new Date().toISOString(), nivel, evento, ...datos }),
  );
}

export const registro = {
  info: (evento, datos) => escribir("info", evento, datos),
  aviso: (evento, datos) => escribir("aviso", evento, datos),
  error: (evento, datos) => escribir("error", evento, datos),
};
