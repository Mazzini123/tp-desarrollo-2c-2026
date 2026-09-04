import { colaboradorService, colaboracionService } from "../services/index.js";

export function crear(req, res) {
  res.status(201).json(colaboradorService.crear(req.body));
}

export function listar(req, res) {
  res.status(200).json(colaboradorService.listar());
}

export function obtenerPorId(req, res) {
  res.status(200).json(colaboradorService.buscarPorId(req.params.id));
}

export function actualizar(req, res) {
  res.status(200).json(colaboradorService.actualizar(req.params.id, req.body));
}

export function agregarHabilidad(req, res) {
  const colaborador = colaboradorService.agregarHabilidad(
    req.params.id,
    req.body.codigoHabilidad,
  );
  res.status(200).json(colaborador);
}

export function quitarHabilidad(req, res) {
  const colaborador = colaboradorService.quitarHabilidad(
    req.params.id,
    req.params.codigoHabilidad,
  );
  res.status(200).json(colaborador);
}

export function listarColaboraciones(req, res) {
  res.status(200).json(colaboracionService.listarPorColaborador(req.params.id));
}
