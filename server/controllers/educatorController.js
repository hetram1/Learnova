import { clerkClient } from '@clerk/express'
import Course from '../models/Course.js'
import Enrollment from '../models/Enrollment.js'
import { courseViews } from '../utils/courseView.js'
import { syncUser } from '../middleware/auth.js'

export const updateRoleToEducator = async (req, res) => {
    const profile = await clerkClient.users.updateUserMetadata(req.currentUser._id, { publicMetadata: { role: 'educator' } })
    await syncUser(profile)
    res.json({ success: true, message: 'You can create courses now' })
}
export const educatorCourses = async (req, res) => {
    const courses = await Course.find({ educator: req.currentUser._id }).sort({ createdAt: -1 })
    res.json({ success: true, courses: await courseViews(courses, true) })
}
export const educatorEnrollments = async userId => {
    const courses = await Course.find({ educator: userId }).select('_id')
    return Enrollment.find({ course: { $in: courses.map(course => course._id) } })
        .populate('user', 'name imageUrl').populate('course', 'courseTitle').sort({ createdAt: -1 })
}
const enrollmentView = enrollment => ({
    _id: enrollment._id, student: enrollment.user, courseTitle: enrollment.course.courseTitle,
    enrolledAt: enrollment.createdAt,
})
export const educatorStudents = async (req, res) => {
    const enrollments = await educatorEnrollments(req.currentUser._id)
    res.json({ success: true, students: enrollments.filter(item => item.user && item.course).map(enrollmentView) })
}
export const educatorDashboard = async (req, res) => {
    const courses = await Course.find({ educator: req.currentUser._id }).select('isPublished')
    const enrollments = await educatorEnrollments(req.currentUser._id)
    res.json({ success: true, dashboard: {
        totalCourses: courses.length, publishedCourses: courses.filter(course => course.isPublished).length,
        totalEnrollments: enrollments.length,
        enrolledStudentsData: enrollments.filter(item => item.user && item.course).slice(0, 10).map(enrollmentView),
    } })
}
