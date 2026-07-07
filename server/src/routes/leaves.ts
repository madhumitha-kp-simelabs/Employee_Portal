import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  bookLeave,
  listLeaves,
  cancelLeave,
} from "../controllers/leaveController.js";

const router = Router();

router.use(requireAuth); // all leave routes require login

router.post("/", bookLeave); //      BOOK a leave
router.get("/", listLeaves); //      LIST leaves (optionally ?from=&to=)
router.delete("/:id", cancelLeave); // CANCEL a leave

export default router;
