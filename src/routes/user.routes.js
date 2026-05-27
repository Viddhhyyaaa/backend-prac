import {Router} from "express";
import { registerUser, loginUser,logoutUser,refreshAcessToken } from "../controllers/userController.js";
import {upload} from "../middleware/multer.middleware.js"
import {VerifyJWT} from "../middleware/auth.middleware.js"
const router = Router()
router.route("/register").post(
    upload.fields([  //this is a middleware
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(VerifyJWT, logoutUser)
router.route("refresh-token").post(refreshAcessToken)
export default router