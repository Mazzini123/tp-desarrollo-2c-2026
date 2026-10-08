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

  test("guarda la notificacion interna y la replica por cada medio registrado", async () => {
    const ada = await crearColaborador({
      mediosDeContacto: [
        { tipo: "EMAIL", valor: "ada@mail.com" },
        { tipo: "SMS", valor: "1155551234" },
      ],
    });

    const notificacion = await services.notificacionService.notificar(ada, AVISO);

    expect(notificacion.destinatarioId).toBe(ada.id);
    expect(notificacion.envios).toEqual([
      { canal: "EMAIL", exito: true },
      { canal: "SMS", exito: true },
    ]);
    expect(services.canales.EMAIL.enviados[0]).toMatchObject({
      destino: "ada@mail.com",
      asunto: AVISO.asunto,
    });
    expect(services.canales.SMS.enviados).toHaveLength(1);
    expect(services.canales.WHATSAPP.enviados).toHaveLength(0);
  });

  test("si la persona no acepta mensajeria interna no se le escribe por ningun lado", async () => {
    const ada = await crearColaborador({
      recibeMensajeriaInterna: false,
      mediosDeContacto: [{ tipo: "EMAIL", valor: "ada@mail.com" }],
    });

    expect(await services.notificacionService.notificar(ada, AVISO)).toBeNull();
    expect(services.canales.EMAIL.enviados).toHaveLength(0);
    expect((await services.notificacionService.listar(ada.id)).total).toBe(0);
  });

  test("un proveedor caido no impide la notificacion interna ni los otros envios", async () => {
    services.notificacionService.canales = {
      ...services.canales,
      EMAIL: new CanalEnMemoria({ fallar: true }),
    };
    const ada = await crearColaborador({
      mediosDeContacto: [
        { tipo: "EMAIL", valor: "ada@mail.com" },
        { tipo: "WHATSAPP", valor: "1155551234" },
      ],
    });

    const notificacion = await services.notificacionService.notificar(ada, AVISO);

    expect(notificacion.envios).toEqual([
      { canal: "EMAIL", exito: false },
      { canal: "WHATSAPP", exito: true },
    ]);
    expect((await services.notificacionService.listar(ada.id)).total).toBe(1);
  });

  test("lista de la mas nueva a la mas vieja y marca como leida", async () => {
    const ada = await crearColaborador();
    const vieja = await services.notificacionService.notificar(ada, { ...AVISO, asunto: "1" });
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
