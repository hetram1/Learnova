import { Router } from 'express'
import { requireUser, requireEducator } from '../middleware/auth.js'
import { updateRoleToEducator, educatorCourses, educatorDashboard, educatorStudents } from '../controllers/educatorController.js'
const router = Router()
router.use(requireUser)
router.post('/update-role', updateRoleToEducator)
router.use(requireEducator)
router.get('/courses', educatorCourses)
router.get('/dashboard', educatorDashboard)
router.get('/students', educatorStudents)
export default router
