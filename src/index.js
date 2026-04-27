import dotenv from "dotenv"

dotenv.config();
import mongoose from "mongoose";

import connectDB from "./db/index.js";

connectDB()
//here server will listen after the connection of mongodb
.then(()=>{
    app.listen(process.env.PORT|| 8000, ()=>{
        console.log(`server is running at port:${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("Mongo db connection failed!!!", err);
})














//import express from "express"
//just for my knowledge, here it is mandatory to 
//use try catch with mongodb along with async and await
//so that there will be no execution order disturbance
//also using IIFE for first execution and not to get polluted with global traffic.
//  const app= express()
// (async ()=> {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}
//             /{DB_NAME}`)
//             app.on("error", (error)=>{
//                 console.log("ERR:", error);
//                 throw error 
//             })
//             app.listen(process.env.PORT, ()=>{
//                 console.log(`App is listening on port ${process.env.PORT}`);
//             })

//     }
//     catch(error){
//         console.error("ERROR: ", error)
//         throw err

//     }
// })()