/**
 * Middleware de validación de forma. Corre antes del controller y
 * valida el cuerpo de la petición contra un esquema de Zod.
 *
 * Esta es la primera capa de defensa: valida tipos y formatos (que
 * precio sea un número, que no falten campos obligatorios) y responde
 * 400 con los issues, para que quien integra la API sepa exactamente
 * qué faltó. Las reglas de negocio -que un código no se repita, que
 * el proyecto esté abierto- viven más adentro, en el dominio y los
 * servicios.
 */
export function validate(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);

    if (!resultado.success) {
      res.status(400).json({
        error: "Datos inválidos",
        issues: resultado.error.issues,
      });
      return;
    }

    req.body = resultado.data;
    next();
  };
}
