import express, { urlencoded } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const app= express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
//express accepting json responses
app.use(express.json({limit: "16kb"}))
//express code for accepting url based respones
app.use(express.urlencoded({extended: true, limit: "16kb"}))
//express code for loading the static files from PUBLIC directory which doesn't require routing
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from './routes/user.routes.js'

//routes declaration
app.use("/users", userRouter)
export {app}