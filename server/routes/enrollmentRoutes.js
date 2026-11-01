import { Router } from 'express'
import { requireUser } from '../middleware/auth.js'
import { enroll, myEnrollments, updateProgress, rateCourse } from '../controllers/enrollmentController.js'
const router = Router()
router.use(requireUser)
router.get('/', myEnrollments)
router.post('/:courseId', enroll)
router.put('/:courseId/progress/:lectureId', updateProgress)
router.put('/:courseId/rating', rateCourse)
export default router
