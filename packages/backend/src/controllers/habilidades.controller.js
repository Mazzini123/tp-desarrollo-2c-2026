import { habilidadService } from "../services/index.js";

export function crear(req, res) {
  res.status(201).json(habilidadService.crear(req.body));
}

export function listar(req, res) {
  res.status(200).json(habilidadService.listar());
}
