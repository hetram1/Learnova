import { Webhook } from 'svix'
import User from '../models/User.js'
import Course from '../models/Course.js'
import Enrollment from '../models/Enrollment.js'
import { syncUser } from '../middleware/auth.js'

export const clerkWebhooks = async (req, res) => {
    let event
    try {
        event = new Webhook(process.env.CLERK_WEBHOOK_SECRET).verify(req.body.toString('utf8'), {
            'svix-id': req.headers['svix-id'], 'svix-timestamp': req.headers['svix-timestamp'],
            'svix-signature': req.headers['svix-signature'],
        })
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' })
    }
    const { data, type } = event
    if (type === 'user.created' || type === 'user.updated') {
        await syncUser({
            id: data.id, firstName: data.first_name, lastName: data.last_name, username: data.username,
            imageUrl: data.image_url, publicMetadata: data.public_metadata,
            primaryEmailAddressId: data.primary_email_address_id,
            emailAddresses: data.email_addresses?.map(email => ({ id: email.id, emailAddress: email.email_address })),
        })
    } else if (type === 'user.deleted') {
        await User.findByIdAndDelete(data.id)
        await Enrollment.deleteMany({ user: data.id })
        await Course.updateMany({ educator: data.id }, { $set: { isPublished: false } })
    }
    res.json({ success: true })
}
