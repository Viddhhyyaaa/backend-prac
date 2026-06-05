import { asyncHandler } from "../utils/asyncHandler.js";
import { APIerror } from "../utils/APIerror.js"
import { User } from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
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
    if (!(username || email)){
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
    .cookie("accessToken", options)
    .cookie("refreshToken" ,options)
    .json(new ApiResponse(200, {}, "user logged out"))
})

const refreshAcessToken = asynchHandler(async(req, res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken //cookies from web or mobile app
  if (!incomingRefreshToken){
    throw new APIerror(401, "unauthorized request")
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)
    //still if user doesnt exists
    if (!user){
      throw new APIerror(401, "Invalid refresh token")
    }
    if(incomingRefreshToken !== user?.refreshToken){
      throw new APIerror(401, "Refresh token is expired or used")
    }
    const options = {
      httpOnly: true,
      secure: true
    }
    const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    return res
    .status(200)
    .cookie("acessToken", accessToken, options)
    .cookie("refresh", refreshtoken, options)
    .json(
      new ApiResponse(
          200, {accessToken, refreshToken: newrefreshToken}, "Access token refreshed"
      )
      
    )
  } catch (error) {
    throw new AppiError(401, error?.message || "invalid refresh token")
  }
})
const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body
    const user= await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new APIerror(400, "Invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

})
const getCurrentUser = asynchHandler(async (req,res) => {
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully")
})
const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body
    if(!fullName || !email){
        throw new APIerror(400, "All fields are required")
    }
    User.findByIdAndUpdate(req.user?._id, 
        {
            $set:{
                fullName: fullName, //can be like fullName, only 
                email: email
            }
        },
        {new: true}
    ).select("-Password") //directly removing password from it instead of making another db call to remove password from it
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account data has been updated"))
})
const uploadUserAvatar= asynchHandler(async (req, res) => {
    const avatarLocalPath  = req.file?.path 
    if(!avatarLocalPath){
        throw new APIerror(400, "Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new APIerror(400, "Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url //only have to give url and not the avatar object
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "avatar has beeen updated successfully")
    )
})
const uploadUserCoverImage= asynchHandler(async (req, res) => {
    const coverImageLocalPath  = req.file?.path 
    if(!coverImageLocalPath){
        throw new APIerror(400, "coverImage file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new APIerror(400, "Error while uploading on coverImage")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url //only have to give url and not the avatar object
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "coverImage has beeen updated successfully")
    )
})
const getUserChannelProfile = asyncHandler(async (req,res) => {
    const {username} = req.params
    if(!username?.trim()){
        throw new APIerror(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",   
                foreignField: "channel",
                as: "subscribers"
            }
        },{
            $lookup:{
                //subscribed 
                from: "subscriptions",
                localField: "_id",  
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "subscribers.subscriber"]},
                        then: true, 
                        else: false
                    }
                }
                
            }
            

        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
        
    ])
    if(!channel?.length){
        throw new AppiError(404, "channel name doesnt exist")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0], "user channel data fetched successfully")
    )
})
const getWatchHistory = asynchHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "WatchHistory",
                pipeline: [
                    {
                        $lookup:{
                           from: "user",
                           localField: "owner",
                           foreignField: "_id",
                           as: "owner" ,
                           pipeline:[
                            {
                                $project: {
                                    fullName: 1,
                                    username:1,
                                    avatar:1
                                }

                            }
                           ]
                        }
                    },
                    {
                        $addFields:{
                            owner: {
                                $first: "$owner" 
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully")
    )
})
export {registerUser, 
    loginUser , 
    logoutUser, 
    refreshAcessToken ,
    changeCurrentPassword, 
    getCurrentUser, updateAccountDetails, 
    uploadUserAvatar , uploadUserCoverImage,
    getUserChannelProfile, getWatchHistory
}