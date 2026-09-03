import { Router } from "express";
import healthRouter from "./health.routes.js";

const router = Router();

router.use("/health", healthRouter);

// A medida que avancemos:
// router.use("/colectivos", colectivosRouter);
// router.use("/proyectos", proyectosRouter);
// router.use("/colaboradoras", colaboradorasRouter);
// router.use("/habilidades", habilidadesRouter);

export default router;
