import {
  armarServices,
  crearColectivoDePrueba,
  datosDePerfil,
  CODIGOS,
} from "../fixtures.js";
import { DomainError } from "../../src/errors/DomainError.js";
import { ConflictError } from "../../src/errors/ConflictError.js";
import { NotFoundError } from "../../src/errors/NotFoundError.js";

// Requerimiento adicional 8: aceptacion y rechazo automatico de postulaciones.
describe("Postulaciones", () => {
  let services;
  let colectivo;
  let numero;

  beforeEach(async () => {
    services = await armarServices();
    colectivo = await crearColectivoDePrueba(services.colectivoService);
    numero = 0;
  });

  function crearProyecto(perfil = {}, otrosPerfiles = []) {
    return services.proyectoService.crear({
      colectivoId: colectivo.id,
      titulo: "Sitio",
      descripcion: "...",
      perfiles: [
        { ...datosDePerfil({ requeridas: [CODIGOS.node] }), ...perfil },
        ...otrosPerfiles,
      ],
    });
  }

  async function postular(proyecto, perfil = proyecto.perfiles[0]) {
    numero += 1;
    const colaborador = await services.colaboradorService.crear({
      cuentaGit: `persona-${numero}`,
      codigosHabilidades: [CODIGOS.node],
    });
    return services.colaboracionService.registrar({
      proyectoId: proyecto.id,
      perfilId: perfil.id,
      colaboradorId: colaborador.id,
    });
  }

  // Lo que quedo guardado en la base (el objeto que devolvio el servicio no
  // se entera de lo que cambio despues).
  const releer = (proyecto) => services.proyectoService.buscarPorId(proyecto.id);
  const estadoDe = async (proyecto, colaboracion) =>
    (await releer(proyecto)).buscarColaboracion(colaboracion.id).estado;

  const actualizarPerfil = (proyecto, datos) =>
    services.perfilService.actualizar(proyecto.id, proyecto.perfiles[0].id, datos);

  test("por defecto el perfil es de revision manual", async () => {
    const proyecto = await crearProyecto({ modoAceptacion: undefined });
    expect(proyecto.perfiles[0].modoAceptacion).toBe("REVISION_MANUAL");
    expect((await postular(proyecto)).estado).toBe("PENDIENTE");
  });

  describe("TODO_SUMA", () => {
    test("acepta cada postulacion en el momento", async () => {
      const proyecto = await crearProyecto({ modoAceptacion: "TODO_SUMA" });
      expect((await postular(proyecto)).estado).toBe("ACEPTADA");
    });

    test("no se puede combinar con un limite de colaboraciones", async () => {
      await expect(
        crearProyecto({ modoAceptacion: "TODO_SUMA", limiteColaboraciones: 2 }),
      ).rejects.toThrow(DomainError);
    });
  });

  describe("HASTA_LLENAR_VACANTES", () => {
    test("deja pendientes hasta llegar al limite, y ahi acepta a todas", async () => {
      const proyecto = await crearProyecto({
        modoAceptacion: "HASTA_LLENAR_VACANTES",
        limiteColaboraciones: 2,
      });

      const primera = await postular(proyecto);
      expect(primera.estado).toBe("PENDIENTE");

      const segunda = await postular(proyecto);
      expect(segunda.estado).toBe("ACEPTADA");
      expect(await estadoDe(proyecto, primera)).toBe("ACEPTADA");
    });

    test("al alcanzar el limite se cierra la busqueda del perfil", async () => {
      const proyecto = await crearProyecto({
        modoAceptacion: "HASTA_LLENAR_VACANTES",
        limiteColaboraciones: 1,
      });
      await postular(proyecto);

      expect((await releer(proyecto)).perfiles[0].busquedaAbierta).toBe(false);
      await expect(postular(proyecto)).rejects.toThrow(ConflictError);
    });

    test("sin limite no se puede usar", async () => {
      await expect(
        crearProyecto({ modoAceptacion: "HASTA_LLENAR_VACANTES" }),
      ).rejects.toThrow(DomainError);
    });

    test("a quienes quedaron esperando se les avisa que fueron aceptadas", async () => {
      const proyecto = await crearProyecto({
        modoAceptacion: "HASTA_LLENAR_VACANTES",
        limiteColaboraciones: 2,
      });
      const primera = await postular(proyecto);
      await postular(proyecto);

      const bandeja = await services.notificacionService.listar(primera.colaborador.id);
      expect(bandeja.items.map((n) => n.tipo)).toContain("POSTULACION_ACEPTADA");
    });

    test("llenar un perfil no rechaza las postulaciones a otro perfil", async () => {
      const proyecto = await crearProyecto(
        { modoAceptacion: "HASTA_LLENAR_VACANTES", limiteColaboraciones: 1 },
        [
          datosDePerfil({
            requeridas: [CODIGOS.node],
            modoAceptacion: "REVISION_MANUAL",
          }),
        ],
      );
      const enOtroPerfil = await postular(proyecto, proyecto.perfiles[1]);
      await postular(proyecto);

      expect(enOtroPerfil.estado).toBe("PENDIENTE");
    });
  });

  describe("REVISION_MANUAL", () => {
    let proyecto;

    beforeEach(async () => {
      proyecto = await crearProyecto({
        modoAceptacion: "REVISION_MANUAL",
        limiteColaboraciones: 1,
      });
    });

    test("nada se resuelve solo", async () => {
      expect((await postular(proyecto)).estado).toBe("PENDIENTE");
      expect((await postular(proyecto)).estado).toBe("PENDIENTE");
    });

    test("alcanzado el limite no se acepta a nadie mas, pero tampoco se rechaza sola", async () => {
      const a = await postular(proyecto);
      const b = await postular(proyecto);

      await services.colaboracionService.aceptar(proyecto.id, a.id);

      expect(await estadoDe(proyecto, a)).toBe("ACEPTADA");
      expect(await estadoDe(proyecto, b)).toBe("PENDIENTE");
      await expect(
        services.colaboracionService.aceptar(proyecto.id, b.id),
      ).rejects.toThrow(ConflictError);
    });

    test("rechazar a mano deja la postulacion rechazada y avisa", async () => {
      const a = await postular(proyecto);
      const rechazada = await services.colaboracionService.rechazar(proyecto.id, a.id);

      expect(rechazada.estado).toBe("RECHAZADA");
      expect(rechazada.fechaResolucion).toBeInstanceOf(Date);
      const bandeja = await services.notificacionService.listar(a.colaborador.id);
      expect(bandeja.items.map((n) => n.tipo)).toContain("POSTULACION_RECHAZADA");
    });

    test("no se puede resolver dos veces la misma postulacion", async () => {
      const a = await postular(proyecto);
      await services.colaboracionService.rechazar(proyecto.id, a.id);
      await expect(
        services.colaboracionService.aceptar(proyecto.id, a.id),
      ).rejects.toThrow(ConflictError);
    });

    test("una colaboracion que no existe tira NotFoundError", async () => {
      await expect(
        services.colaboracionService.aceptar(proyecto.id, "no-existe"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("busqueda del perfil", () => {
    test("con la busqueda cerrada no se puede postular", async () => {
      const proyecto = await crearProyecto({ busquedaAbierta: false });
      await expect(postular(proyecto)).rejects.toThrow(ConflictError);
    });

    test("pasada la fecha de cierre de la busqueda no se puede postular", async () => {
      const proyecto = await crearProyecto({
        fechaCierreBusqueda: new Date("2000-01-01"),
      });
      await expect(postular(proyecto)).rejects.toThrow(ConflictError);
    });

    test("un perfil que no es del proyecto tira NotFoundError", async () => {
      const proyecto = await crearProyecto();
      await expect(postular(proyecto, { id: "no-existe" })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("desvincular", () => {
    test("pasa una colaboracion aceptada a DESVINCULADA y avisa", async () => {
      const proyecto = await crearProyecto({ modoAceptacion: "TODO_SUMA" });
      const a = await postular(proyecto);

      const desvinculada = await services.colaboracionService.desvincular(
        proyecto.id,
        a.id,
      );

      expect(desvinculada.estado).toBe("DESVINCULADA");
      expect(desvinculada.fechaFin).toBeInstanceOf(Date);
      const bandeja = await services.notificacionService.listar(a.colaborador.id);
      expect(bandeja.items.map((n) => n.tipo)).toContain("DESVINCULACION");
    });

    test("solo se puede desvincular una colaboracion aceptada", async () => {
      const proyecto = await crearProyecto({ modoAceptacion: "REVISION_MANUAL" });
      const a = await postular(proyecto);

      await expect(
        services.colaboracionService.desvincular(proyecto.id, a.id),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("cambiar la configuracion del perfil", () => {
    test("pasar de revision manual a TODO_SUMA acepta a las pendientes", async () => {
      const proyecto = await crearProyecto({ modoAceptacion: "REVISION_MANUAL" });
      const a = await postular(proyecto);

      await actualizarPerfil(proyecto, { modoAceptacion: "TODO_SUMA" });

      expect(await estadoDe(proyecto, a)).toBe("ACEPTADA");
    });

    test("el limite no puede quedar por debajo de las ya aceptadas", async () => {
      const proyecto = await crearProyecto({ modoAceptacion: "TODO_SUMA" });
      await postular(proyecto);
      await postular(proyecto);

      await expect(
        actualizarPerfil(proyecto, {
          modoAceptacion: "REVISION_MANUAL",
          limiteColaboraciones: 1,
        }),
      ).rejects.toThrow(DomainError);
    });
  });
});
