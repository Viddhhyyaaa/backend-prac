import { asyncHandler } from "../utils/asyncHandler.js";
import { APIerror } from "../utils/APIerror.js"
import { User } from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res)=>{
    //get user details from frontend
    const {fullName, email, username, password}= req.body
    console.log("email:", email); 
    

    if(
        [fullName, email, username, password].some((field)=> field?.trim() === "")
    ){
        throw new APIerror(400, "All fields are required")
    }

    //check if user already exists: username and email 
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser){
        throw new APIerror(409, "User with this email or username already exists")
    }

      //check for images, check for avtar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    
    if(!avatarLocalPath){
        throw new APIerror(400, "Avatar file is required")
    }

    //upload them to cloudinary, avtar check(multer and cloudinary)
    //console.log(req.files)
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log("avatar response:", avatar)
    if(!avatar){
        throw new APIerror(400, "Avatar file is required")
    }

     //create user object(nosql it is) -- create entry in database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //remove password and refresh token fields from the response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //check for user creation 
    if(!createdUser){
        throw new APIerror(500, "Something went wrong while registering the user")
    }

    //return response 
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered sucessfully")
        //new object is created out of Apiresponse class
    )
})

export {registerUser}