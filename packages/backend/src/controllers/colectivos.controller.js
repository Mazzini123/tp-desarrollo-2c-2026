import { colectivoService, proyectoService } from "../services/index.js";

export function crear(req, res) {
  res.status(201).json(colectivoService.crear(req.body));
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

// Los proyectos viven dentro del colectivo, así que el alta va
// anidada bajo /colectivos/:id/proyectos.
export function crearProyecto(req, res) {
  const proyecto = proyectoService.crear({ ...req.body, colectivoId: req.params.id });
  res.status(201).json(proyecto);
}

export function listarProyectos(req, res) {
  res.status(200).json(proyectoService.listarPorColectivo(req.params.id));
}
