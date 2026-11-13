import { z } from "zod";
import { TIPOS_MEDIOS_CONTACTO } from "../domain/enums/TIPOS_MEDIOS_CONTACTO.js";

const telefono = z
  .string()
  .trim()
  .regex(
    /^\+?[\d\s-]{8,20}$/,
    "Telefono invalido: solo digitos, espacios, guiones y + inicial",
  )
  .transform((valor) => valor.replace(/[\s-]/g, ""));

const telefonoSMS = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, "SMS requiere + y codigo de pais, con 8 a 15 digitos"),
  );

function crearMedioDeContactoSchema(sms) {
  return z.discriminatedUnion("tipo", [
    z
      .object({
        tipo: z.literal(TIPOS_MEDIOS_CONTACTO.EMAIL),
        valor: z.string().trim().toLowerCase().pipe(z.email()),
      })
      .strict(),
    z
      .object({ tipo: z.literal(TIPOS_MEDIOS_CONTACTO.WHATSAPP), valor: telefono })
      .strict(),
    z.object({ tipo: z.literal(TIPOS_MEDIOS_CONTACTO.SMS), valor: sms }).strict(),
  ]);
}

export const medioDeContactoSchema = crearMedioDeContactoSchema(telefonoSMS);

export const mediosDeContactoSchema = z.array(medioDeContactoSchema).max(10);

// La baja debe seguir aceptando los numeros locales guardados antes de exigir
// formato internacional en las altas SMS; no inferimos el pais de esos datos.
export const medioDeContactoEnRutaSchema = z
  .looseObject({ tipo: z.string(), valor: z.string() })
  .transform(({ tipo, valor }) => ({ tipo, valor }))
  .pipe(crearMedioDeContactoSchema(telefono));
