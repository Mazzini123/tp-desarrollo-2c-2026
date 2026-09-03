import { habilidadService } from "../services/index.js";

export function crear(req, res) {
  const habilidad = habilidadService.crear(req.body);
  res.status(201).json(habilidad);
}

export function listar(req, res) {
  res.status(200).json(habilidadService.listar());
}
