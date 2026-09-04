import { proyectoService, colaboracionService } from "../services/index.js";

export function listar(req, res) {
  res.status(200).json(proyectoService.listar());
}

export function obtenerPorId(req, res) {
  res.status(200).json(proyectoService.buscarPorId(req.params.id));
}

export function actualizar(req, res) {
  res.status(200).json(proyectoService.actualizar(req.params.id, req.body));
}

export function finalizar(req, res) {
  res.status(200).json(proyectoService.finalizar(req.params.id));
}

export function agregarHabilidad(req, res) {
  const proyecto = proyectoService.agregarHabilidadRequerida(
    req.params.id,
    req.body.codigoHabilidad,
  );
  res.status(200).json(proyecto);
}

export function quitarHabilidad(req, res) {
  const proyecto = proyectoService.quitarHabilidadRequerida(
    req.params.id,
    req.params.codigoHabilidad,
  );
  res.status(200).json(proyecto);
}

export function anotarColaborador(req, res) {
  const colaboracion = colaboracionService.registrar({
    proyectoId: req.params.id,
    colaboradorId: req.body.colaboradorId,
  });
  res.status(201).json(colaboracion);
}

export function listarColaboraciones(req, res) {
  res.status(200).json(colaboracionService.listarPorProyecto(req.params.id));
}
