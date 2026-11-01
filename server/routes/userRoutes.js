import { Router } from 'express'
import { clerkClient } from '@clerk/express'
import { requireUser, syncUser } from '../middleware/auth.js'
import { httpError, pickFields } from '../utils/courseView.js'
const router = Router()
router.use(requireUser)
router.get('/me', (req, res) => res.json({ success: true, user: req.currentUser }))
router.patch('/me', async (req, res) => {
    const fields = pickFields(req.body, ['firstName', 'lastName'])
    if (!Object.keys(fields).length || Object.values(fields).some(value => typeof value !== 'string' || value.length > 100)) {
        throw httpError(400, 'Provide a valid firstName or lastName')
    }
    const profile = await clerkClient.users.updateUser(req.currentUser._id, fields)
    res.json({ success: true, user: await syncUser(profile) })
})
export default router
