import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createEmployee,
  listEmployees,
  exportEmployeesCsv,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";

const router = Router();

// Protect EVERY employee route below: the request must carry a valid JWT.
// router.use(...) applies this middleware to all routes in this file.
router.use(requireAuth);

// upload.single("photo") handles the photo file before the controller runs.
router.post("/", upload.single("photo"), createEmployee); //      CREATE
router.get("/", listEmployees); //                                READ (list)
router.get("/export", exportEmployeesCsv); //                     EXPORT (CSV stream)
router.put("/:id", upload.single("photo"), updateEmployee); //    UPDATE
router.delete("/:id", deleteEmployee); //                         DELETE

export default router;
