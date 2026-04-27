//this is a utility function to handle the async functions in the express
//it will take a requestHandler(can be any name of the function) as an argument and return a Promise 
// with the error handling logic wrapped around the request handler.

const asyncHandler=(requestHandler)=> {
    (req, res, next)=> {
        Promise.resolve(requestHandler(req, res)).
        catch((err)=> next(err))
    }
}


export {asyncHandler}
//one way to handle the async functions in the express is to use the try catch block but
//  it is not a good way to write the code because it will make the code look messy 
// and hard to read so we can use the asyncHandler function to handle the async 
// functions in a cleaner way
// const asyncHandler = (funct)=> async(req,res,next) =>{
//     try{
//         await funct(req,res,next)

//     }catch(error){
//         res.status(error.code || 500).json({
//             success:false,
//             message: error.message
//         })

//     }
// }