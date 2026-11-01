import { clerkClient, getAuth } from '@clerk/express'
import User from '../models/User.js'
export const syncUser = profile => User.findByIdAndUpdate(profile.id, { $set: {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || 'Learner',
    email: profile.emailAddresses?.find(email => email.id === profile.primaryEmailAddressId)?.emailAddress || profile.emailAddresses?.[0]?.emailAddress || '',
    imageUrl: profile.imageUrl || '',
    role: profile.publicMetadata?.role === 'educator' ? 'educator' : 'student',
} }, { upsert: true, new: true, runValidators: true })
export const requireUser = async (req, res, next) => {
    const { userId, sessionStatus } = getAuth(req)
    if (!userId) {
        const headerReason = res.getHeader('x-clerk-auth-reason')
        const reason = sessionStatus === 'pending' ? 'session-pending' :
            typeof headerReason === 'string' && /^[a-z0-9-]{1,100}$/.test(headerReason) ? headerReason : 'session-unverified'
        console.warn('Authentication rejected:', reason, { hasBearerToken: Boolean(req.headers.authorization?.startsWith('Bearer ')) })
        return res.status(401).json({ success: false, message: 'Sign in to continue', reason })
    }
    // Read server-managed Clerk metadata so stale tokens cannot retain educator access.
    req.currentUser = await syncUser(await clerkClient.users.getUser(userId))
    next()
}
export const requireEducator = (req, res, next) => {
    if (req.currentUser.role !== 'educator') return res.status(403).json({ success: false, message: 'Educator access required' })
    next()
}
