import { asyncHandler } from "../utils/asyncHandler.js";
import { APIerror } from "../utils/APIerror.js"
import { User } from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken  = refreshToken    //saving refreshtoken into DB
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    }
    catch (error) {
        throw new APIerror(500, "Something went wrong while generating access and refresh token")
    }
}
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
   // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
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
const loginUser = asyncHandler(async (req, res)=>{
    //req body se data
    const {email , username, password}= req.body
    //username or email check
    if (!username || !email){
        throw new APIerror(400, "username or email is required")
    }
    //find the user
    const user = await User.findOne({
        $or: [{username} ,{email}]
    })
    if(!user){
        throw new APIerror(404, "user does not exist")
    }
    //password check
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new APIerror(401, "invalid password")
    }
    //access and refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    //send cookie
    const options = {
        httpOnly: true,
        secure : true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken" , refreshToken, options)
    .json(
        new ApiResponse(
            200,{
                user: loggedInUser, accessToken, refreshToken
            },
            "user loggedin successfully"
        )
    )
})
const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
        $set: {
            refreshToken : undefined
        }
        },
        {
             new : true
        }
       
    )  
    const options = {
        httpOnly: true,
        secure : true
    }
      return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken" , refreshToken, options)
    .json(new ApiResponse(200, {}, "user logged out"))

})
export {registerUser, loginUser , logoutUser }