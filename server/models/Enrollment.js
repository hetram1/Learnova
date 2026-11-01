import mongoose from 'mongoose'
const enrollmentSchema = new mongoose.Schema({
    user: { type: String, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    completedLectures: { type: [String], default: [] },
    rating: { type: Number, min: 0, max: 5, default: 0 },
}, { timestamps: true })
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true })
export default mongoose.model('Enrollment', enrollmentSchema)
