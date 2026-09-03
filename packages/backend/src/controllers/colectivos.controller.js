import { colectivoService } from "../services/index.js";

export function crear(req, res) {
  const colectivo = colectivoService.crear(req.body);
  res.status(201).json(colectivo);
}

export function listar(req, res) {
  res.status(200).json(colectivoService.listar());
}

export function obtenerPorId(req, res) {
  res.status(200).json(colectivoService.buscarPorId(req.params.id));
}

export function actualizar(req, res) {
  res.status(200).json(colectivoService.actualizar(req.params.id, req.body));
}
