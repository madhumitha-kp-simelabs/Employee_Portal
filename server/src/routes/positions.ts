import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createPosition,
  listPositions,
  deletePosition,
} from "../controllers/positionController.js";

const router = Router();

// Protect all position routes: must be logged in.
router.use(requireAuth);

router.post("/", createPosition); //      CREATE
router.get("/", listPositions); //        READ (list)
router.delete("/:id", deletePosition); // DELETE

export default router;
