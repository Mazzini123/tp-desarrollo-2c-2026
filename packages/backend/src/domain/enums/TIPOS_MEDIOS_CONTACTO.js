import { esValorDeEnum } from "../../utils/validaciones.js";

export const TIPOS_MEDIOS_CONTACTO = Object.freeze({
    SMS: "SMS",
    EMAIL: "EMAIL",
    WHATSAPP: "WHATSAPP",
});

export const esTipoMedioContactoValido = (valor) =>
    esValorDeEnum(TIPOS_MEDIOS_CONTACTO, valor);
