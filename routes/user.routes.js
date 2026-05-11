import {Router} from "express";
import { registerUser } from "../src/controllers/userController.js";
const router = Router()
router.route("/register").post(registerUser)
export default router