import { z } from "zod";

// Los enlaces se validan igual que las redes sociales: solo http y https.
// Un "javascript:..." guardado como enlace al sistema seria un XSS esperando
// a que alguien lo clickee en la pagina del proyecto.
const enlaceSchema = z.url({ protocol: /^https?$/ });

export const crearAvanceSchema = z
  .object({
    porcentajeConcrecion: z.number().min(0).max(100),
    urlSistema: enlaceSchema,
    urlRepositorio: enlaceSchema,
  })
  .strict();
