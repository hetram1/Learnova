import mongoose from "mongoose";

// Connect to the MongoDB database

const ConnectDB = async ()=>{
    mongoose.connection.on('connected',()=> console.log('DB Connect'))

        await mongoose.connect(`${process.env.MONGODB_URI}/lms`)
}

export default ConnectDB
