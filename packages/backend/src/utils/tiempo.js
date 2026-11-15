export async function conLimiteDeTiempo(
  promesa,
  milisegundos,
  descripcion = "La operacion",
) {
  let temporizador;
  const vencimiento = new Promise((_, rechazar) => {
    temporizador = setTimeout(
      () => rechazar(new Error(`${descripcion} no respondio en ${milisegundos} ms`)),
      milisegundos,
    );
  });
  try {
    return await Promise.race([promesa, vencimiento]);
  } finally {
    clearTimeout(temporizador);
  }
}
