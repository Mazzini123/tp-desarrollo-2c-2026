import { armarApp } from "./app.js";
import { CODIGOS, crearProyectoDePrueba, crearColaboradorDePrueba } from "../fixtures.js";
import { UnauthorizedError } from "../../src/errors/UnauthorizedError.js";

const autenticadorDePrueba = {
  async autenticar(token) {
    if (!token.startsWith("cuenta-")) {
      throw new UnauthorizedError("La sesion no es valida o vencio", "TOKEN_INVALIDO");
    }
    return { proveedor: "prueba", sub: token };
  },
};

export const DIA = 86_400_000;
export const enDias = (dias, desde = new Date()) =>
  new Date(desde.getTime() + dias * DIA);

export async function armarAdministracion() {
  const { api, services, canales } = await armarApp({
    autenticador: autenticadorDePrueba,
  });
  const contextos = new Map();
  const token = (cuenta) => ({ Authorization: `Bearer cuenta-${cuenta}` });
  const como = (cuenta, contextoId = contextos.get(cuenta)) =>
    contextoId ? { ...token(cuenta), "X-Context-Id": contextoId } : token(cuenta);

  const yo = async (cuenta) => {
    const { body } = await api.get("/auth/me").set(token(cuenta)).expect(200);
    if (body.contextoActual) contextos.set(cuenta, body.contextoActual.id);
    return body;
  };
  const elegir = async (cuenta, contextoId) => {
    await api
      .put("/auth/contexto-actual")
      .set(token(cuenta))
      .send({ contextoId })
      .expect(200);
    contextos.set(cuenta, contextoId);
  };
  const usuario = async (cuenta) => {
    await api.post("/auth/registro").set(token(cuenta));
    await api.put("/auth/usuario").set(token(cuenta)).send({ nombre: cuenta });
    return (await yo(cuenta)).usuario.id;
  };
  const administradora = async (cuenta) => {
    const usuarioId = await usuario(cuenta);
    await services.administradorService.otorgar({ usuarioId });
    const { contextos: todos } = await yo(cuenta);
    const admin = todos.find((c) => c.tipo === "ADMINISTRACION");
    await elegir(cuenta, admin.id);
    return { usuarioId, contextoId: admin.id };
  };
  const lideraUnColectivo = async (cuenta, nombre = `Colectivo de ${cuenta}`) => {
    await usuario(cuenta);
    const { body: colectivo } = await api
      .post("/colectivos")
      .set(token(cuenta))
      .send({ nombre, descripcion: "d", tipoColectivo: "ONG" })
      .expect(201);
    await yo(cuenta);
    return colectivo;
  };
  const contextoDe = async (cuenta, tipo) =>
    (await yo(cuenta)).contextos.find((c) => c.tipo === tipo);
  const personaConPerfil = async (cuenta) => {
    await usuario(cuenta);
    await api
      .post("/colaboradores")
      .set(token(cuenta))
      .send({ cuentaGit: cuenta, codigosHabilidades: [CODIGOS.node] })
      .expect(201);
    await yo(cuenta);
  };
  const proyectoSuelto = async (titulo = "Sitio institucional") =>
    (await crearProyectoDePrueba(services, { titulo })).proyecto;
  const proyectoConAceptada = async (cuentaGit, aceptadaEn = new Date()) => {
    const { proyecto } = await crearProyectoDePrueba(services);
    const persona = await crearColaboradorDePrueba(services.colaboradorService, {
      cuentaGit,
    });
    await services.colaboracionService.registrar(
      {
        proyectoId: proyecto.id,
        perfilId: proyecto.perfiles[0].id,
        colaboradorId: persona.id,
      },
      aceptadaEn,
    );
    return proyecto;
  };

  return {
    api,
    services,
    canales,
    token,
    como,
    yo,
    elegir,
    usuario,
    administradora,
    lideraUnColectivo,
    contextoDe,
    personaConPerfil,
    proyectoSuelto,
    proyectoConAceptada,
  };
}
