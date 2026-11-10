import { armarServices } from "../fixtures.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";
import { TIPO_NOTIFICACION } from "../../src/domain/enums/TIPO_NOTIFICACION.js";
import { CanalEnMemoria } from "../../src/canales/CanalEnMemoria.js";

const AVISO = {
  tipo: TIPO_NOTIFICACION.INVITACION,
  asunto: "Te invitan a un proyecto",
  contenido: "Hola!",
};

describe("NotificacionService", () => {
  let services;

  beforeEach(async () => {
    services = await armarServices();
  });

  function crearColaborador(datos = {}) {
    return services.colaboradorService.crear({ cuentaGit: "ada", ...datos });
  }

  const procesar = (ahora = new Date()) =>
    services.notificacionService.procesarEnviosPendientes(ahora);
  const enviosDe = async (notificacion) =>
    (await services.notificacionService.listar(notificacion.destinatarioId)).items
      .find((n) => n.id === notificacion.id)
      .toJSON().envios;

  test("guarda la notificacion y deja un envio pendiente por cada medio registrado", async () => {
    const ada = await crearColaborador({
      mediosDeContacto: [
        { tipo: "EMAIL", valor: "ada@mail.com" },
        { tipo: "SMS", valor: "1155551234" },
      ],
    });

    const notificacion = await services.notificacionService.notificar(ada, AVISO);

    expect(notificacion.esPara(ada.id)).toBe(true);
    // El pedido no espera a ningun proveedor: los envios quedan pendientes.
    expect(notificacion.toJSON().envios).toEqual([
      { canal: "EMAIL", estado: "PENDIENTE", exito: false, intentos: 0 },
      { canal: "SMS", estado: "PENDIENTE", exito: false, intentos: 0 },
    ]);
    expect(services.canales.EMAIL.enviados).toHaveLength(0);
  });

  test("el job manda los envios pendientes y los deja ENVIADO", async () => {
    const ada = await crearColaborador({
      mediosDeContacto: [
        { tipo: "EMAIL", valor: "ada@mail.com" },
        { tipo: "SMS", valor: "1155551234" },
      ],
    });
    const notificacion = await services.notificacionService.notificar(ada, AVISO);

    expect(await procesar()).toEqual({ enviados: 2, reintentos: 0, fallidos: 0 });

    expect(await enviosDe(notificacion)).toEqual([
      { canal: "EMAIL", estado: "ENVIADO", exito: true, intentos: 1 },
      { canal: "SMS", estado: "ENVIADO", exito: true, intentos: 1 },
    ]);
    expect(services.canales.EMAIL.enviados[0]).toMatchObject({
      destino: "ada@mail.com",
      asunto: AVISO.asunto,
    });
    expect(services.canales.SMS.enviados).toHaveLength(1);
    expect(services.canales.WHATSAPP.enviados).toHaveLength(0);
    // Ya no queda nada pendiente.
    expect(await procesar()).toEqual({ enviados: 0, reintentos: 0, fallidos: 0 });
  });

  test("si la persona no acepta mensajeria interna no se le escribe por ningun lado", async () => {
    const ada = await crearColaborador({
      recibeMensajeriaInterna: false,
      mediosDeContacto: [{ tipo: "EMAIL", valor: "ada@mail.com" }],
    });

    expect(await services.notificacionService.notificar(ada, AVISO)).toBeNull();
    await procesar();
    expect(services.canales.EMAIL.enviados).toHaveLength(0);
    expect((await services.notificacionService.listar(ada.id)).total).toBe(0);
  });

  test("un proveedor caido no frena los otros envios, y el suyo se reintenta con espera", async () => {
    const caido = new CanalEnMemoria({ fallar: true });
    services.notificacionService.canales = { ...services.canales, EMAIL: caido };
    const ada = await crearColaborador({
      mediosDeContacto: [
        { tipo: "EMAIL", valor: "ada@mail.com" },
        { tipo: "WHATSAPP", valor: "1155551234" },
      ],
    });
    const notificacion = await services.notificacionService.notificar(ada, AVISO);
    const ahora = new Date();

    expect(await procesar(ahora)).toEqual({ enviados: 1, reintentos: 1, fallidos: 0 });
    expect(await enviosDe(notificacion)).toEqual([
      { canal: "EMAIL", estado: "PENDIENTE", exito: false, intentos: 1 },
      { canal: "WHATSAPP", estado: "ENVIADO", exito: true, intentos: 1 },
    ]);
    // Antes de que pase la espera (un minuto) no se vuelve a intentar.
    expect(await procesar(new Date(ahora.getTime() + 30_000))).toEqual({
      enviados: 0,
      reintentos: 0,
      fallidos: 0,
    });

    // El proveedor vuelve: al proximo intento sale.
    caido.fallar = false;
    expect(await procesar(new Date(ahora.getTime() + 61_000))).toEqual({
      enviados: 1,
      reintentos: 0,
      fallidos: 0,
    });
    expect(caido.enviados).toHaveLength(1);
  });

  test("agotados los intentos, el envio queda FALLIDO y no se intenta mas", async () => {
    services.notificacionService.canales = {
      ...services.canales,
      EMAIL: new CanalEnMemoria({ fallar: true }),
    };
    const ada = await crearColaborador({
      mediosDeContacto: [{ tipo: "EMAIL", valor: "ada@mail.com" }],
    });
    const notificacion = await services.notificacionService.notificar(ada, AVISO);

    // Esperas de 1, 2, 4 y 8 minutos: con una hora de margen entre corridas
    // cada intento ya esta vencido.
    let ahora = Date.now();
    const resultados = [];
    for (let i = 0; i < 6; i++) {
      ahora += 60 * 60_000;
      resultados.push(await procesar(new Date(ahora)));
    }

    expect(resultados.map((r) => r.fallidos)).toEqual([0, 0, 0, 0, 1, 0]);
    expect(await enviosDe(notificacion)).toEqual([
      { canal: "EMAIL", estado: "FALLIDO", exito: false, intentos: 5 },
    ]);
  });

  test("un proveedor que no responde se corta por tiempo y se reintenta", async () => {
    services.notificacionService.canales = {
      ...services.canales,
      EMAIL: new CanalEnMemoria({ colgar: true }),
    };
    services.notificacionService.politica = {
      ...services.notificacionService.politica,
      limiteDeTiempoMs: 50,
    };
    const ada = await crearColaborador({
      mediosDeContacto: [{ tipo: "EMAIL", valor: "ada@mail.com" }],
    });
    const notificacion = await services.notificacionService.notificar(ada, AVISO);

    expect(await procesar()).toEqual({ enviados: 0, reintentos: 1, fallidos: 0 });
    expect((await enviosDe(notificacion))[0]).toMatchObject({
      estado: "PENDIENTE",
      intentos: 1,
    });
  });

  test("dos jobs a la vez no mandan dos veces el mismo envio", async () => {
    const ada = await crearColaborador({
      mediosDeContacto: [{ tipo: "EMAIL", valor: "ada@mail.com" }],
    });
    await services.notificacionService.notificar(ada, AVISO);

    const ahora = new Date();
    await Promise.all([procesar(ahora), procesar(ahora), procesar(ahora)]);

    expect(services.canales.EMAIL.enviados).toHaveLength(1);
  });

  test("lista de la mas nueva a la mas vieja y marca como leida", async () => {
    const ada = await crearColaborador();
    const vieja = await services.notificacionService.notificar(ada, {
      ...AVISO,
      asunto: "1",
    });
    vieja.fecha = new Date("2020-01-01");
    await services.notificacionService.notificar(ada, { ...AVISO, asunto: "2" });

    const pagina = await services.notificacionService.listar(ada.id);
    expect(pagina.items.map((n) => n.asunto)).toEqual(["2", "1"]);

    const leida = await services.notificacionService.marcarComoLeida(ada.id, vieja.id);
    expect(leida.esLeida).toBe(true);
  });

  test("no se puede marcar como leida la notificacion de otra persona", async () => {
    const ada = await crearColaborador();
    const grace = await crearColaborador({ cuentaGit: "grace" });
    const deAda = await services.notificacionService.notificar(ada, AVISO);

    await expect(
      services.notificacionService.marcarComoLeida(grace.id, deAda.id),
    ).rejects.toThrow(NotFoundError);
  });
});
