import express from 'express'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks } from './controllers/webhooks.js'
import courseRouter from './routes/courseRoutes.js'
import educatorRouter from './routes/educatorRoutes.js'
import enrollmentRouter from './routes/enrollmentRoutes.js'
import userRouter from './routes/userRoutes.js'

const app = express()
app.disable('x-powered-by')
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(value => value.trim())
app.use(cors({ origin: origins }))
app.get('/', (_req, res) => res.json({ success: true, message: 'Learnova API' }))
app.use(async (_req, _res, next) => {
    try { await connectDB(); next() } catch (error) { next(error) }
})
app.post('/clerk', express.raw({ type: 'application/json', limit: '1mb' }), clerkWebhooks)
app.use(express.json({ limit: '1mb' }))
app.use(clerkMiddleware({ authorizedParties: origins, jwtKey: process.env.CLERK_JWT_KEY }))
app.use('/api/courses', courseRouter)
app.use('/api/educator', educatorRouter)
app.use('/api/enrollments', enrollmentRouter)
app.use('/api/users', userRouter)
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }))
app.use((error, _req, res, _next) => {
    const status = error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 :
        error.code === 11000 || error.name === 'VersionError' ? 409 : 500)
    if (status >= 500) console.error('API error:', error.name)
    res.status(status).json({ success: false, message: status >= 500 ? 'The server could not complete the request' : error.message })
})
export default app
