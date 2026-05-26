import {asyncHandler} from "../utils/asyncHandler.js"
import {APIerror} from "../utils/APIerror.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.models.js"

export const VerifyJWT = asyncHandler(async(req, res,next)=>{

   try {
     const token = req.cookies ?.accessToken || req.header("Authorization")?.replace("Bearer","")
 
     if(!token){
         throw new APIerror (401 , "unauth req")
     }

     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

     if(!user){  
         throw new APIerror(401, "Invalid access token")
     }

     req.user = user;
     next()

   } catch (error) {
       throw new APIerror(401, error?.message || "invalid access token")
   }
})