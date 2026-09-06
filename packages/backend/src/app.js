import express from "express";
import cors from "cors";
import router from "./routes/router.js";
import { AppError } from "./errors/AppError.js";

const app = express();
app.use(express.json());
app.use(cors());
app.use(router);

// Cuando se vea middleware se lo implementa ahi.
app.use((req, res) => {
  res.status(404).json({ error: "Recurso no encontrado" });
});

app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
