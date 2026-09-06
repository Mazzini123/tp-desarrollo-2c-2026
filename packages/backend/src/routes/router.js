import { Router } from "express";
import healthRouter from "./healthRouter.js";
import colectivosRouter from "./colectivosRouter.js";
import proyectosRouter from "./proyectosRouter.js";
import habilidadesRouter from "./habilidadesRouter.js";
import colaboradoresRouter from "./colaboradoresRouter.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/colectivos", colectivosRouter);
router.use("/proyectos", proyectosRouter);
router.use("/habilidades", habilidadesRouter);
router.use("/colaboradores", colaboradoresRouter);

export default router;
