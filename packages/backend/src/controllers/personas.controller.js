import { personaColaboradoraService, colaboracionService } from "../services/index.js";

export function crear(req, res) {
  const persona = personaColaboradoraService.crear(req.body);
  res.status(201).json(persona);
}

export function listar(req, res) {
  res.status(200).json(personaColaboradoraService.listar());
}

export function obtenerPorId(req, res) {
  res.status(200).json(personaColaboradoraService.buscarPorId(req.params.id));
}

export function actualizar(req, res) {
  res.status(200).json(personaColaboradoraService.actualizar(req.params.id, req.body));
}

export function agregarHabilidad(req, res) {
  const persona = personaColaboradoraService.agregarHabilidad(
    req.params.id,
    req.body.codigoHabilidad,
  );
  res.status(200).json(persona);
}

export function quitarHabilidad(req, res) {
  const persona = personaColaboradoraService.quitarHabilidad(
    req.params.id,
    req.params.codigoHabilidad,
  );
  res.status(200).json(persona);
}

export function listarColaboraciones(req, res) {
  res.status(200).json(colaboracionService.listarPorPersona(req.params.id));
}
