import { Router } from 'express'
import { requireUser, requireEducator } from '../middleware/auth.js'
import { createCourse, getAllCourses, getCourseById, updateCourse, deleteCourse, ownedCourse, manageContent, getContent } from '../controllers/courseController.js'

const router = Router()
router.get('/', getAllCourses)
router.get('/:id', getCourseById)
router.get('/:id/chapters', getContent)
router.get('/:id/chapters/:chapterId', getContent)
router.get('/:id/chapters/:chapterId/lectures', getContent)
router.get('/:id/chapters/:chapterId/lectures/:lectureId', getContent)
router.use(requireUser, requireEducator)
router.post('/', createCourse)
router.use('/:id', ownedCourse)
router.put('/:id', updateCourse)
router.delete('/:id', deleteCourse)
router.post('/:id/chapters', manageContent)
router.put('/:id/chapters/:chapterId', manageContent)
router.delete('/:id/chapters/:chapterId', manageContent)
router.post('/:id/chapters/:chapterId/lectures', manageContent)
router.put('/:id/chapters/:chapterId/lectures/:lectureId', manageContent)
router.delete('/:id/chapters/:chapterId/lectures/:lectureId', manageContent)
export default router
