import mongoose from 'mongoose'
const userSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    role: { type: String, enum: ['student', 'educator'], default: 'student' },
}, { timestamps: true })
export default mongoose.model('User', userSchema)
