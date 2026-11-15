import { ColectivoModel } from "../../src/models/ColectivoModel.js";
import { ProyectoModel } from "../../src/models/ProyectoModel.js";
import { ColaboracionModel } from "../../src/models/ColaboracionModel.js";
import { ColaboradorModel } from "../../src/models/ColaboradorModel.js";
import { HabilidadModel } from "../../src/models/HabilidadModel.js";
import { NotificacionModel } from "../../src/models/NotificacionModel.js";
import { CODIGOS, datosDePerfil } from "../fixtures.js";
import { armarServicesConMongo, usarBaseDeTest } from "./baseDeTest.js";

/**
 * Lo que se guarda vuelve de la base con TODOS sus campos.
 *
 * Mongoose descarta en silencio cualquier campo que no este en el schema. Si
 * alguien agrega un atributo y se olvida del schema, el dato desaparece sin
 * ningun error. Estos tests cargan cada entidad con todo lo que puede tener,
 * la vuelven a leer con una consulta nueva y revisan campo por campo.
 */
usarBaseDeTest();

let s;
beforeEach(async () => {
  s = await armarServicesConMongo();
});

const lista = (array) => [...array];
const sinInternos = (subdocumento) => subdocumento?.toObject() ?? null;

test("un colectivo con todo su agregado vuelve completo", async () => {
  const colectivo = await s.colectivoService.crear({
    nombre: "Fundacion Ejemplo",
    descripcion: "Una fundacion de prueba",
    tipoColectivo: "FUNDACION",
    ubicacion: { tipoUbicacion: "PROVINCIA", nombre: "Cordoba" },
    redesSociales: [{ nombre: "Instagram", url: "https://instagram.com/fundacion" }],
    etiquetas: ["Educación Popular"],
    mediosDeContacto: [{ tipo: "EMAIL", valor: "hola@fundacion.org" }],
  });

  const proyecto = await s.proyectoService.crear({
    colectivoId: colectivo.id,
    titulo: "Sitio institucional",
    descripcion: "Un sitio para la fundacion",
    fechaCierre: new Date("2030-01-01T00:00:00Z"),
    etiquetas: ["web"],
    perfiles: [
      {
        ...datosDePerfil({
          requeridas: [CODIGOS.node],
          opcionales: [CODIGOS.react],
          modoAceptacion: "REVISION_MANUAL",
          limiteColaboraciones: 3,
        }),
        fechaCierreBusqueda: new Date("2029-06-01T00:00:00Z"),
      },
    ],
  });

  const ada = await s.colaboradorService.crear({
    nombre: "Ada",
    apellido: "Lovelace",
    cuentaGit: "ada",
    pronombres: ["ella"],
    presentacion: "Programadora",
    codigosHabilidades: [CODIGOS.node],
  });

  const colaboracion = await s.colaboracionService.registrar({
    proyectoId: proyecto.id,
    perfilId: proyecto.perfiles[0].id,
    colaboradorId: ada.id,
    esPublica: false,
  });
  await s.colaboracionService.aceptar(proyecto.id, colaboracion.id);
  await s.logroService.crear(proyecto.id, {
    titulo: "Primer hito",
    descripcion: "Quedo online",
  });
  await s.avanceService.registrar(proyecto.id, {
    porcentajeConcrecion: 40,
    urlSistema: "https://fundacion.org",
    urlRepositorio: "https://github.com/fundacion/sitio",
  });
  await s.colaboracionService.finalizar(proyecto.id, colaboracion.id);
  await s.valoracionService.valorar(proyecto.id, colaboracion.id, {
    autor: "COLECTIVO",
    puntaje: 5,
    comentario: "Excelente",
  });

  // Una consulta nueva, directo al modelo: nada de lo que quedo en memoria.
  const leido = await ColectivoModel.findById(colectivo.id);

  expect(leido.nombre).toBe("Fundacion Ejemplo");
  expect(sinInternos(leido.ubicacion)).toEqual({
    tipoUbicacion: "PROVINCIA",
    nombre: "Cordoba",
  });
  expect(leido.redesSociales.map(sinInternos)).toEqual([
    { nombre: "Instagram", url: "https://instagram.com/fundacion" },
  ]);
  expect(lista(leido.etiquetas)).toEqual(["educacion-popular"]);
  expect(leido.mediosDeContacto.map(sinInternos)).toEqual([
    { tipo: "EMAIL", valor: "hola@fundacion.org" },
  ]);
  expect(leido.fechaAlta).toBeInstanceOf(Date);
  expect(leido.fechaBaja).toBeNull();

  // El proyecto y sus colaboraciones estan en sus propias colecciones.
  const [p] = await ProyectoModel.find({ colectivoId: colectivo.id });
  expect(p.id).toBe(proyecto.id);
  expect(p.datosDelColectivo.nombre).toBe("Fundacion Ejemplo");
  expect(p.fechaCierre).toEqual(new Date("2030-01-01T00:00:00Z"));
  expect(lista(p.etiquetas)).toEqual(["web"]);
  // Los metodos de dominio estan en lo que vuelve de la base (loadClass).
  expect(p.estaAbierto()).toBe(true);

  const perfil = p.perfiles[0];
  expect(perfil.habilidadesRequeridas.map(sinInternos)).toEqual([
    { codigo: CODIGOS.node, titulo: "Desarrollo Node" },
  ]);
  expect(perfil.codigosOpcionales()).toEqual([CODIGOS.react]);
  expect(sinInternos(perfil.compromiso)).toEqual({
    cantidadHoras: 5,
    periodo: "HS_MENSUALES",
  });
  expect(perfil.modalidadColaboracion).toBe("GRATUITA");
  expect(perfil.modoAceptacion).toBe("REVISION_MANUAL");
  expect(perfil.limiteColaboraciones).toBe(3);
  expect(perfil.busquedaAbierta).toBe(true);
  expect(perfil.fechaCierreBusqueda).toEqual(new Date("2029-06-01T00:00:00Z"));

  const [c] = await ColaboracionModel.find({ proyectoId: p._id }).populate("colaborador");
  expect(String(c.colectivoId)).toBe(colectivo.id);
  expect(c.estado).toBe("FINALIZADA");
  expect(String(c.perfil)).toBe(perfil.id);
  expect(c.esPublica).toBe(false);
  expect(c.colaborador.cuentaGit).toBe("ada"); // poblado
  expect(c.fechaResolucion).toBeInstanceOf(Date);
  expect(c.fechaFin).toBeInstanceOf(Date);
  expect(c.valoracionDelColectivo.puntaje).toBe(5);
  expect(c.valoracionDelColectivo.comentario).toBe("Excelente");
  expect(c.valoracionDelColaborador).toBeNull();

  expect(p.logros.map((l) => l.titulo)).toEqual(["Primer hito"]);
  expect(p.avances.map((a) => a.porcentajeConcrecion)).toEqual([40]);
  // Calculados por el hook pre('validate') a partir del ultimo avance.
  expect(p.porcentajeConcrecion).toBe(40);
  expect(p.urlRepositorio).toBe("https://github.com/fundacion/sitio");
});

test("una colaboradora vuelve completa, medios de contacto incluidos", async () => {
  const creada = await s.colaboradorService.crear({
    nombreFantasia: "La Programadora",
    cuentaGit: "ada",
    pronombres: ["ella", "elle"],
    presentacion: "Hola",
    recibeMensajeriaInterna: false,
    codigosHabilidades: [CODIGOS.node, CODIGOS.react],
    mediosDeContacto: [{ tipo: "SMS", valor: "11 5555 1234" }],
    redesSociales: [{ nombre: "GitHub", url: "https://github.com/ada" }],
  });

  const leida = await ColaboradorModel.findById(creada.id);

  expect(leida.nombreFantasia).toBe("La Programadora");
  expect(lista(leida.pronombres)).toEqual(["ella", "elle"]);
  expect(leida.recibeMensajeriaInterna).toBe(false);
  expect(leida.habilidades.map((h) => h.codigo)).toEqual([CODIGOS.node, CODIGOS.react]);
  expect(leida.redesSociales.map((r) => r.url)).toEqual(["https://github.com/ada"]);
  // Se guardan aunque nunca se muestren.
  expect(leida.mediosDeContacto.map(sinInternos)).toEqual([
    { tipo: "SMS", valor: "11 5555 1234" },
  ]);
  expect(JSON.parse(JSON.stringify(leida))).not.toHaveProperty("mediosDeContacto");
});

test("las notificaciones quedan guardadas para su destinataria", async () => {
  const { proyecto } = await crearProyecto();
  const ada = await s.colaboradorService.crear({
    cuentaGit: "ada",
    codigosHabilidades: [CODIGOS.node],
  });

  await s.reclutamientoService.invitar(proyecto.id, proyecto.perfiles[0].id, {
    colaboradorId: ada.id,
    mensaje: "Te esperamos",
  });

  await s.avisoAutomaticoService.procesarPendientes(new Date(), { tope: 100 });
  const guardadas = await NotificacionModel.find({ destinatarioId: ada.id });
  // El aviso automatico al darla de alta y la invitacion.
  expect(guardadas.map((n) => n.tipo)).toEqual(
    expect.arrayContaining(["PROYECTOS_COMPATIBLES", "INVITACION"]),
  );
  expect(guardadas.every((n) => n.esPara(ada.id))).toBe(true);
});

test("el codigo de habilidad es unico tambien en la base (indice unique)", async () => {
  // El service ya lo controla; el indice es la ultima defensa si dos altas
  // llegan a la vez.
  const repetida = new HabilidadModel({ titulo: "Desarrollo Node" });
  await expect(repetida.save()).rejects.toMatchObject({ code: 11000 });
});

test("un id con formato invalido es un 'no existe', no un error", async () => {
  await expect(s.colectivoService.buscarPorId("no-es-un-id")).rejects.toMatchObject({
    status: 404,
  });
  await expect(s.proyectoService.buscarPorId("123")).rejects.toMatchObject({
    status: 404,
  });
});

async function crearProyecto() {
  const colectivo = await s.colectivoService.crear({
    nombre: "Fundacion",
    descripcion: "...",
    tipoColectivo: "FUNDACION",
  });
  const proyecto = await s.proyectoService.crear({
    colectivoId: colectivo.id,
    titulo: "Sitio",
    descripcion: "...",
    perfiles: [datosDePerfil({ requeridas: [CODIGOS.node] })],
  });
  return { colectivo, proyecto };
}
