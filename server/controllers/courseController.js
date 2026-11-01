import { getAuth } from '@clerk/express'
import Course from '../models/Course.js'
import Enrollment from '../models/Enrollment.js'
import { courseViews, courseFields, pickFields, httpError } from '../utils/courseView.js'

export const createCourse = async (req, res) => {
    const course = await Course.create({ ...pickFields(req.body, courseFields), educator: req.currentUser._id })
    res.status(201).json({ success: true, course })
}
export const getAllCourses = async (req, res) => {
    const filter = { isPublished: true }
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
        const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        filter.courseTitle = { $regex: escaped, $options: 'i' }
    }
    if (typeof req.query.category === 'string') filter.courseCategory = req.query.category
    const courses = await Course.find(filter).populate('educator', 'name imageUrl').sort({ createdAt: -1 })
    res.json({ success: true, courses: await courseViews(courses) })
}
export const visibleCourse = async req => {
    const course = await Course.findById(req.params.id).populate('educator', 'name imageUrl')
    if (!course) throw httpError(404, 'Course not found')
    const { userId } = getAuth(req)
    const owner = course.educator?._id === userId
    const enrollment = userId ? await Enrollment.findOne({ user: userId, course: course._id }) : null
    if (!course.isPublished && !owner && !enrollment) throw httpError(404, 'Course not found')
    const [view] = await courseViews([course], Boolean(owner || enrollment))
    return { ...view, isEnrolled: Boolean(enrollment) }
}
export const getCourseById = async (req, res) => res.json({ success: true, course: await visibleCourse(req) })
export const ownedCourse = async (req, _res, next) => {
    const course = await Course.findById(req.params.id)
    if (!course) throw httpError(404, 'Course not found')
    if (course.educator !== req.currentUser._id) throw httpError(403, 'You can only manage your own courses')
    req.course = course
    next()
}
export const updateCourse = async (req, res) => {
    Object.assign(req.course, pickFields(req.body, courseFields))
    await req.course.save()
    res.json({ success: true, course: req.course })
}
export const deleteCourse = async (req, res) => {
    // Keep existing enrollments usable; educators can unpublish a course instead.
    if (await Enrollment.exists({ course: req.course._id })) throw httpError(409, 'This course has enrollments. Unpublish it instead.')
    await req.course.deleteOne()
    res.json({ success: true })
}
const chapterFields = ['chapterTitle', 'chapterOrder', 'chapterContent']
const lectureFields = ['lectureTitle', 'lectureDuration', 'lectureUrl', 'isPreviewFree', 'lectureOrder']
export const manageContent = async (req, res) => {
    const course = req.course
    let chapter = course.chapters.find(item => item.chapterId === req.params.chapterId)
    if (req.params.chapterId && !chapter) throw httpError(404, 'Chapter not found')
    if (req.params.lectureId) {
        const index = chapter.chapterContent.findIndex(item => item.lectureId === req.params.lectureId)
        if (index < 0) throw httpError(404, 'Lecture not found')
        if (req.method === 'DELETE') chapter.chapterContent.splice(index, 1)
        else Object.assign(chapter.chapterContent[index], pickFields(req.body, lectureFields))
    } else if (req.path.endsWith('/lectures')) {
        chapter.chapterContent.push({ ...pickFields(req.body, lectureFields), lectureOrder: req.body?.lectureOrder || chapter.chapterContent.length + 1 })
    } else if (req.params.chapterId) {
        if (req.method === 'DELETE') course.chapters = course.chapters.filter(item => item.chapterId !== req.params.chapterId)
        else Object.assign(chapter, pickFields(req.body, chapterFields))
    } else {
        course.chapters.push({ ...pickFields(req.body, chapterFields), chapterOrder: req.body?.chapterOrder || course.chapters.length + 1 })
    }
    await course.save()
    res.status(req.method === 'POST' ? 201 : 200).json({ success: true, course })
}
export const getContent = async (req, res) => {
    const course = await visibleCourse(req)
    if (!req.params.chapterId) return res.json({ success: true, chapters: course.chapters })
    const chapter = course.chapters.find(item => item.chapterId === req.params.chapterId)
    if (!chapter) throw httpError(404, 'Chapter not found')
    if (!req.params.lectureId) return res.json(req.path.endsWith('/lectures') ? { success: true, lectures: chapter.chapterContent } : { success: true, chapter })
    const lecture = chapter.chapterContent.find(item => item.lectureId === req.params.lectureId)
    if (!lecture) throw httpError(404, 'Lecture not found')
    res.json({ success: true, lecture })
}
