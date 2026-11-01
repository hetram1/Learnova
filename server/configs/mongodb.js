import mongoose from 'mongoose'
let connectionPromise
const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')
    if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.MONGODB_DB_NAME || 'lms', serverSelectionTimeoutMS: 8000,
        }).catch(error => { connectionPromise = undefined; throw error })
    }
    return connectionPromise
}
export default connectDB
