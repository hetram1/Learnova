import mongoose from 'mongoose'
import Enrollment from '../models/Enrollment.js'
export const courseViews = async (courses, fullAccess = false) => {
    const stats = await Enrollment.aggregate([
        { $match: { course: { $in: courses.map(course => new mongoose.Types.ObjectId(course._id)) } } },
        { $group: { _id: '$course', enrollmentCount: { $sum: 1 },
            ratingCount: { $sum: { $cond: [{ $gt: ['$rating', 0] }, 1, 0] } },
            ratingTotal: { $sum: '$rating' } } },
    ])
    return courses.map(course => {
        const data = course.toObject()
        const stat = stats.find(item => String(item._id) === String(course._id))
        data.enrollmentCount = stat?.enrollmentCount || 0
        data.ratingCount = stat?.ratingCount || 0
        data.averageRating = data.ratingCount ? stat.ratingTotal / data.ratingCount : 0
        delete data.__v
        delete data.enrolledStudents
        delete data.courseRatings
        data.chapters.forEach(chapter => chapter.chapterContent.forEach(lecture => {
            if (!fullAccess && !lecture.isPreviewFree) delete lecture.lectureUrl
        }))
        return data
    })
}
export const courseFields = ['courseTitle', 'courseDescription', 'coursePrice', 'discount', 'courseThumbnail', 'courseCategory', 'chapters', 'isPublished']
export const pickFields = (body, fields) => Object.fromEntries(fields.filter(key => body?.[key] !== undefined).map(key => [key, body[key]]))
export const httpError = (status, message) => Object.assign(new Error(message), { status })
