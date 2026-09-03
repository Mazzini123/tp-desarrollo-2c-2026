import { Router } from "express";
import healthRouter from "./health.routes.js";
import colectivosRouter from "./colectivos.routes.js";
import proyectosRouter from "./proyectos.routes.js";
import habilidadesRouter from "./habilidades.routes.js";
import personasRouter from "./personas.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/colectivos", colectivosRouter);
router.use("/proyectos", proyectosRouter);
router.use("/habilidades", habilidadesRouter);
router.use("/colaboradoras", personasRouter);

export default router;
