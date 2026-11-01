import Course from '../models/Course.js'
import Enrollment from '../models/Enrollment.js'
import { courseViews, httpError } from '../utils/courseView.js'

export const enroll = async (req, res) => {
    const course = await Course.findById(req.params.courseId)
    if (!course?.isPublished) throw httpError(404, 'Published course not found')
    if (course.educator === req.currentUser._id) throw httpError(400, 'You already have access as the course educator')
    const enrollment = await Enrollment.findOneAndUpdate(
        { user: req.currentUser._id, course: course._id }, { $setOnInsert: { completedLectures: [], rating: 0 } },
        { upsert: true, new: true, runValidators: true })
    res.json({ success: true, enrollment })
}
export const myEnrollments = async (req, res) => {
    const enrollments = await Enrollment.find({ user: req.currentUser._id }).populate({
        path: 'course', populate: { path: 'educator', select: 'name imageUrl' },
    }).sort({ createdAt: -1 })
    const existing = enrollments.filter(item => item.course)
    const courses = await courseViews(existing.map(item => item.course), true)
    res.json({ success: true, courses: courses.map((course, index) => ({
        ...course, completedLectures: existing[index].completedLectures,
        myRating: existing[index].rating, enrolledAt: existing[index].createdAt,
    })) })
}
export const updateProgress = async (req, res) => {
    const course = await Course.findById(req.params.courseId)
    if (!course) throw httpError(404, 'Course not found')
    if (!course.chapters.some(chapter => chapter.chapterContent.some(lecture => lecture.lectureId === req.params.lectureId))) {
        throw httpError(404, 'Lecture not found')
    }
    const enrollment = await Enrollment.findOneAndUpdate(
        { user: req.currentUser._id, course: course._id },
        { $addToSet: { completedLectures: req.params.lectureId } }, { new: true })
    if (!enrollment) throw httpError(403, 'Enroll in this course first')
    res.json({ success: true, completedLectures: enrollment.completedLectures })
}
export const rateCourse = async (req, res) => {
    if (!Number.isInteger(req.body?.rating) || req.body.rating < 1 || req.body.rating > 5) throw httpError(400, 'Rating must be an integer from 1 to 5')
    const enrollment = await Enrollment.findOneAndUpdate(
        { user: req.currentUser._id, course: req.params.courseId }, { $set: { rating: req.body.rating } },
        { new: true, runValidators: true })
    if (!enrollment) throw httpError(403, 'Enroll in this course first')
    res.json({ success: true, rating: enrollment.rating })
}
