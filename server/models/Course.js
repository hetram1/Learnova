import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'

export const isWebUrl = value => {
    try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}
const lectureSchema = new mongoose.Schema({
    lectureId: { type: String, default: randomUUID, required: true },
    lectureTitle: { type: String, required: true, trim: true },
    lectureDuration: { type: Number, required: true, min: 0.01 },
    lectureUrl: { type: String, required: true, validate: { validator: isWebUrl, message: 'A valid HTTP(S) video URL is required' } },
    isPreviewFree: { type: Boolean, default: false },
    lectureOrder: { type: Number, required: true, min: 1 },
}, { _id: false })
const chapterSchema = new mongoose.Schema({
    chapterId: { type: String, default: randomUUID, required: true },
    chapterTitle: { type: String, required: true, trim: true },
    chapterOrder: { type: Number, required: true, min: 1 },
    chapterContent: { type: [lectureSchema], default: [] },
}, { _id: false })
const courseSchema = new mongoose.Schema({
    courseTitle: { type: String, required: true, trim: true },
    courseDescription: { type: String, required: true },
    coursePrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    courseThumbnail: { type: String, default: '', validate: {
        validator: value => !value || (value.length <= 750000 && (isWebUrl(value) || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value))),
        message: 'Use an HTTP(S) thumbnail URL or an image smaller than 500 KB',
    } },
    courseCategory: { type: String, required: true, trim: true, default: 'General' },
    educator: { type: String, ref: 'User', required: true, index: true },
    chapters: { type: [chapterSchema], default: [] },
    isPublished: { type: Boolean, default: false, index: true },
}, { timestamps: true, optimisticConcurrency: true })
courseSchema.pre('validate', function () {
    const chapterIds = new Set()
    const lectureIds = new Set()
    this.chapters.sort((a, b) => a.chapterOrder - b.chapterOrder).forEach((chapter, index) => {
        chapter.chapterOrder = index + 1
        if (chapterIds.has(chapter.chapterId)) this.invalidate('chapters', 'Chapter IDs must be unique')
        chapterIds.add(chapter.chapterId)
        chapter.chapterContent.sort((a, b) => a.lectureOrder - b.lectureOrder).forEach((lecture, i) => {
            lecture.lectureOrder = i + 1
            if (lectureIds.has(lecture.lectureId)) this.invalidate('chapters', 'Lecture IDs must be unique within a course')
            lectureIds.add(lecture.lectureId)
        })
    })
    if (this.isPublished && (!this.chapters.length || this.chapters.some(chapter => !chapter.chapterContent.length))) {
        this.invalidate('isPublished', 'Published courses need at least one chapter, with lectures in every chapter')
    }
    if (!this.courseDescription?.replace(/<[^>]*>/g, '').trim()) this.invalidate('courseDescription', 'Course description is required')
})
export default mongoose.model('Course', courseSchema)
