import { ContextoUsuarioModel } from "./ContextoUsuarioModel.js";
import { UsuarioModel } from "./UsuarioModel.js";
import { ColectivoModel } from "../../models/ColectivoModel.js";
import { ColaboradorModel } from "../../models/ColaboradorModel.js";
import { exigirReferencia } from "./integridadReferencial.js";
import { TIPO_CONTEXTO } from "../autorizacion/enums/TIPO_CONTEXTO.js";
import { ROL } from "../autorizacion/enums/ROL.js";
import { problemaDeConsistencia } from "../autorizacion/rolesYPermisos.js";
import { esIdValido } from "../../repositories/objectIds.js";

const ORDEN_DE_ALTA = { fechaAlta: 1, _id: 1 };

export class MongoContextoUsuarioRepository {
  constructor({ catalogoRepository }) {
    this.catalogoRepository = catalogoRepository;
  }

  async crear({ usuarioId, tipo, rol, colectivoId = null, colaboradorId = null }) {
    const problema = problemaDeConsistencia({ tipo, rol, colectivoId, colaboradorId });
    if (problema) throw new Error(problema);

    await exigirReferencia(UsuarioModel, usuarioId, "el usuario");
    if (colectivoId) await exigirReferencia(ColectivoModel, colectivoId, "el colectivo");
    if (colaboradorId) {
      await exigirReferencia(ColaboradorModel, colaboradorId, "el colaborador");
    }

    const contexto = await new ContextoUsuarioModel({
      usuarioId,
      tipoContextoId: await this.catalogoRepository.idDeTipoDeContexto(tipo),
      colectivoId,
      colaboradorId,
      rolId: await this.catalogoRepository.idDeRol(rol),
    }).save();
    return this.#conNombres(contexto);
  }

  async buscarPorId(id) {
    return esIdValido(id)
      ? this.#conNombres(await ContextoUsuarioModel.findById(id))
      : null;
  }

  async listarDeUsuario(usuarioId) {
    return this.#variosConNombres(
      await ContextoUsuarioModel.find({ usuarioId }).sort(ORDEN_DE_ALTA),
    );
  }

  async existeActivoDeTipo(usuarioId, tipo) {
    const filtro = await this.#filtro({ usuarioId, tipo, activo: true });
    return Boolean(await ContextoUsuarioModel.exists(filtro));
  }

  async listarActivosDeColectivo(colectivoId) {
    return this.#variosConNombres(
      await ContextoUsuarioModel.find({ colectivoId, activo: true }).sort(ORDEN_DE_ALTA),
    );
  }

  async buscarDeUsuarioEnColectivo(usuarioId, colectivoId) {
    const filtro = await this.#filtro({
      usuarioId,
      colectivoId,
      tipo: TIPO_CONTEXTO.COLECTIVO,
    });
    return this.#conNombres(await ContextoUsuarioModel.findOne(filtro));
  }

  async buscarDeColaborador(colaboradorId) {
    const filtro = await this.#filtro({ colaboradorId, tipo: TIPO_CONTEXTO.COLABORADOR });
    return this.#conNombres(await ContextoUsuarioModel.findOne(filtro));
  }

  async bloquearSi(contextoId, condicion) {
    const { matchedCount } = await ContextoUsuarioModel.updateOne(
      await this.#filtro({ _id: contextoId, activo: true, ...condicion }),
      { $inc: { __v: 1 } },
    );
    return matchedCount === 1;
  }

  async desactivarActivosDeColectivo(colectivoId, fecha = new Date()) {
    const activos = await ContextoUsuarioModel.find(
      { colectivoId, activo: true },
      { _id: 1 },
    );
    const ids = activos.map((c) => c._id);
    await ContextoUsuarioModel.updateMany(
      { _id: { $in: ids } },
      { $set: { activo: false, fechaBaja: fecha } },
    );
    return ids;
  }

  async habilitarMembresia(usuarioId, colectivoId) {
    await exigirReferencia(UsuarioModel, usuarioId, "el usuario");
    await exigirReferencia(ColectivoModel, colectivoId, "el colectivo");
    const filtro = await this.#filtro({
      usuarioId,
      colectivoId,
      tipo: TIPO_CONTEXTO.COLECTIVO,
      activo: false,
    });
    const contexto = await ContextoUsuarioModel.findOneAndUpdate(
      filtro,
      {
        $set: {
          rolId: await this.catalogoRepository.idDeRol(ROL.MIEMBRO),
          activo: true,
          fechaBaja: null,
        },
        $setOnInsert: { colaboradorId: null, fechaAlta: new Date() },
      },
      { upsert: true, returnDocument: "after" },
    );
    return this.#conNombres(contexto);
  }

  async desactivarSi(contextoId, condicion = {}, fecha = new Date()) {
    const { modifiedCount } = await ContextoUsuarioModel.updateOne(
      await this.#filtro({ _id: contextoId, activo: true, ...condicion }),
      { $set: { activo: false, fechaBaja: fecha } },
    );
    return modifiedCount === 1;
  }

  async cambiarRolSi(contextoId, condicion, rolNuevo) {
    const { modifiedCount } = await ContextoUsuarioModel.updateOne(
      await this.#filtro({ _id: contextoId, activo: true, ...condicion }),
      { $set: { rolId: await this.catalogoRepository.idDeRol(rolNuevo) } },
    );
    return modifiedCount === 1;
  }

  async #filtro({ tipo, rol, ...resto }) {
    return {
      ...resto,
      ...(tipo !== undefined && {
        tipoContextoId: await this.catalogoRepository.idDeTipoDeContexto(tipo),
      }),
      ...(rol !== undefined && { rolId: await this.catalogoRepository.idDeRol(rol) }),
    };
  }

  async #conNombres(contexto) {
    if (!contexto) return null;
    contexto.$locals.tipo = await this.catalogoRepository.nombreDeTipoDeContexto(
      contexto.tipoContextoId,
    );
    contexto.$locals.rol = await this.catalogoRepository.nombreDeRol(contexto.rolId);
    return contexto;
  }

  async #variosConNombres(contextos) {
    for (const contexto of contextos) {
      await this.#conNombres(contexto);
    }
    return contextos;
  }
}
