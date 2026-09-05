import express from "express";
import cors from "cors";
import router from "./routes/index.js";
import { AppError } from "./errors/index.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : true,
  }),
);

app.use(router);

// 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: "Recurso no encontrado" });
});

/**
 * Manejador de errores centralizado.
 *
 * Gracias a AppError, acá no hace falta conocer cada tipo concreto:
 * cualquier subclase trae su propio status. Lo que no sea un
 * AppError es algo que no contemplamos, así que va como 500 y se
 * loguea para poder investigarlo.
 */
app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
