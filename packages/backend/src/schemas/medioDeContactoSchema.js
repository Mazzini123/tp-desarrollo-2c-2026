import { z } from "zod";
import { TIPOS_MEDIOS_CONTACTO } from "../domain/enums/TIPOS_MEDIOS_CONTACTO.js";

// Un telefono se guarda solo con digitos y el + inicial: asi "11 5555-1234" y
// "1155551234" son el mismo medio y no se pueden cargar dos veces.
const telefono = z
  .string()
  .trim()
  .regex(/^\+?[\d\s-]{8,20}$/, "Telefono invalido: solo digitos, espacios, guiones y + inicial")
  .transform((valor) => valor.replace(/[\s-]/g, ""));

// El tipo decide como se valida el valor: por eso es una union discriminada.
export const medioDeContactoSchema = z.discriminatedUnion("tipo", [
  z
    .object({
      tipo: z.literal(TIPOS_MEDIOS_CONTACTO.EMAIL),
      valor: z.string().trim().toLowerCase().pipe(z.email()),
    })
    .strict(),
  z.object({ tipo: z.literal(TIPOS_MEDIOS_CONTACTO.WHATSAPP), valor: telefono }).strict(),
  z.object({ tipo: z.literal(TIPOS_MEDIOS_CONTACTO.SMS), valor: telefono }).strict(),
]);

export const mediosDeContactoSchema = z.array(medioDeContactoSchema).max(10);
