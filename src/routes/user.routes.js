import {Router} from "express";
import { registerUser, loginUser,logoutUser,
         refreshAcessToken, changeCurrentPassword, getCurrentUser, 
         updateAccountDetails, uploadUserAvatar, uploadUserCoverImage, 
         getUserChannelProfile, getWatchHistory } from "../controllers/userController.js";
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
router.route("/change-password").post(VerifyJWT, changeCurrentPassword)
router.route("/current-user").get(VerifyJWT, getCurrentUser)
router.route("/update-account").patch(VerifyJWT, updateAccountDetails)
router.route("/avatar").patch(VerifyJWT, upload.single("avatar"), uploadUserAvatar)
router.route("/cover-image").patch(VerifyJWT, upload.single("/coverImage"), uploadUserCoverImage)
router.route("/c/:username").get(VerifyJWT, getUserChannelProfile)
router.route("/history").get(VerifyJWT, getWatchHistory)
export default router