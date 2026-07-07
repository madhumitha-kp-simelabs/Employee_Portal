import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createDepartment,
  listDepartments,
  deleteDepartment,
} from "../controllers/departmentController.js";

const router = Router();

router.use(requireAuth); // protect all department routes

router.post("/", createDepartment); //      CREATE
router.get("/", listDepartments); //         READ (list)
router.delete("/:id", deleteDepartment); //  DELETE

export default router;
