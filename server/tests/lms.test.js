import 'dotenv/config'
import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { randomUUID, generateKeyPairSync, sign } from 'node:crypto'
import mongoose from 'mongoose'
import { clerkClient } from '@clerk/express'
import { Webhook } from 'svix'
import Course from '../models/Course.js'
import Enrollment from '../models/Enrollment.js'
import User from '../models/User.js'
import { youtubeId } from '../../client/src/utils/video.js'

const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength:2048})
const jwtKey = publicKey.export({type:'spki',format:'pem'})
const tokenFor = (user, claims = {}) => {
    const now = Math.floor(Date.now()/1000)
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
    const data = encode({alg:'RS256',typ:'JWT',kid:'test'}) + '.' + encode({
        sub:user, sid:'sess_test_' + user, iss:'https://learnova-test.clerk.accounts.dev',
        iat:now, nbf:now-5, exp:now+300, azp:'http://localhost:5173',
        metadata:{role:'educator'}, ...claims,
    })
    return data + '.' + sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url')
}
const dbName = 'learnova_test_' + randomUUID().replaceAll('-', '').slice(0, 20)
const profiles = Object.fromEntries(['teacher', 'other', 'student', 'outsider'].map(id => [id, {
    id, firstName: id, lastName: 'Test', imageUrl: '', emailAddresses: [],
    publicMetadata: { role: ['teacher', 'other'].includes(id) ? 'educator' : 'student' },
}]))
let server, base, courseId, chapterId, lectureId
const courseData = {
    courseTitle: 'React [Foundations]', courseDescription: '<p>Learn React</p>',
    coursePrice: 0, courseCategory: 'Development', isPublished: false, chapters: [],
}
const lecture = { lectureTitle: 'Private video', lectureDuration: 4, lectureUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
async function request(path, { user, method = 'GET', body, status = 200, headers = {} } = {}) {
    const response = await fetch(base + path, {
        method, headers: { ...(user ? { Authorization: 'Bearer ' + tokenFor(user) } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body && JSON.stringify(body),
    })
    const data = await response.json()
    assert.equal(response.status, status, JSON.stringify(data))
    return data
}

describe('LMS REST integration with real MongoDB and a controlled Clerk identity provider', () => {
    before(async () => {
        assert.ok(process.env.MONGODB_URI, 'Set MONGODB_URI to run the integration tests')
        await mongoose.connect(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 8000 })
        await Enrollment.init()
        mock.method(clerkClient.users, 'getUser', async id => structuredClone(profiles[id]))
        mock.method(clerkClient.users, 'updateUserMetadata', async (id, metadata) => {
            profiles[id].publicMetadata = { ...profiles[id].publicMetadata, ...metadata.publicMetadata }
            return structuredClone(profiles[id])
        })
        mock.method(clerkClient.users, 'updateUser', async (id, values) => {
            Object.assign(profiles[id], values)
            return structuredClone(profiles[id])
        })
        // Exercise the production Express app with a test-only RSA verification key.
        process.env.CLERK_JWT_KEY = jwtKey
        process.env.MONGODB_DB_NAME = dbName
        const {default: app} = await import('../server.js')
        server = app.listen(0, '127.0.0.1')
        await once(server, 'listening')
        base = 'http://127.0.0.1:' + server.address().port
    })
    after(async () => {
        if (server) await new Promise(resolve => server.close(resolve))
        // This randomly named database is created by this test run only.
        try {
            if (mongoose.connection.name === dbName && /^learnova_test_[a-f0-9]+$/.test(dbName)) {
                await Promise.all([Course.deleteMany({}), Enrollment.deleteMany({}), User.deleteMany({})])
            }
        } finally { await mongoose.disconnect(); mock.restoreAll() }
    })

    it('serves health, rejects invalid signatures and expired sessions, and returns REST errors', async () => {
        assert.equal((await request('/')).success, true)
        await request('/missing', {status:404})
        for (const token of ['invalid-token', tokenFor('teacher',{exp:1}), tokenFor('teacher',{azp:'https://malicious.example'})]) {
            await request('/api/users/me', {headers:{Authorization:'Bearer ' + token}, status:401})
        }
    })
    it('denies anonymous and student course writes', async () => {
        await request('/api/courses', { method: 'POST', body: courseData, status: 401 })
        await request('/api/courses', { user: 'student', method: 'POST', body: courseData, status: 403 })
        await request('/api/educator/dashboard', { user: 'student', status: 403 })
        await request('/api/enrollments', { status: 401 })
    })
    it('syncs Clerk users and ignores attempted role changes in user updates', async () => {
        const me = await request('/api/users/me', { user: 'student' })
        assert.equal(me.user.role, 'student')
        const updated = await request('/api/users/me', { user: 'student', method: 'PATCH', body: { firstName: 'Learner', role: 'educator' } })
        assert.equal(updated.user.name, 'Learner Test')
        assert.equal(updated.user.role, 'student')
    })
    it('creates an owned draft and hides it from discovery and other users', async () => {
        const result = await request('/api/courses', { user: 'teacher', method: 'POST', body: { ...courseData, educator: 'other' }, status: 201 })
        courseId = result.course._id
        assert.equal(result.course.educator, 'teacher')
        assert.equal((await request('/api/courses')).courses.length, 0)
        await request('/api/courses/' + courseId, { status: 404 })
        await request('/api/courses/' + courseId, { user: 'other', status: 404 })
        assert.equal((await request('/api/courses/' + courseId, { user: 'teacher' })).course.courseTitle, courseData.courseTitle)
    })
    it('enforces ownership for courses, chapters, and lectures', async () => {
        for (const path of ['/api/courses/' + courseId, '/api/courses/' + courseId + '/chapters']) {
            await request(path, { user: 'other', method: 'PUT', body: { courseTitle: 'Stolen' }, status: 403 })
        }
        await request('/api/courses/' + courseId, { user: 'other', method: 'DELETE', status: 403 })
    })
    it('rejects invalid course IDs, prices, discounts, and empty published content', async () => {
        await request('/api/courses/not-an-id', { status: 400 })
        await request('/api/courses', {user:'teacher',method:'POST',status:400})
        await request('/api/enrollments/' + courseId + '/rating', {user:'student',method:'PUT',status:400})
        await request('/api/courses', { user: 'teacher', method: 'POST', body: { ...courseData, coursePrice: -1 }, status: 400 })
        await request('/api/courses/' + courseId, { user: 'teacher', method: 'PUT', body: { discount: 101 }, status: 400 })
        await request('/api/courses/' + courseId, { user: 'teacher', method: 'PUT', body: { isPublished: true }, status: 400 })
    })
    it('creates and updates a chapter using the nested REST API', async () => {
        const result = await request('/api/courses/' + courseId + '/chapters', { user: 'teacher', method: 'POST', body: { chapterTitle: 'Getting started' }, status: 201 })
        chapterId = result.course.chapters[0].chapterId
        await request('/api/courses/' + courseId + '/chapters/' + chapterId, { user: 'teacher', method: 'PUT', body: { chapterTitle: 'React Basics' } })
    })
    it('rejects duplicate chapter IDs and duplicate lecture IDs', async () => {
        const chapter = {chapterId:'duplicate',chapterTitle:'Chapter',chapterOrder:1,chapterContent:[]}
        await request('/api/courses', {user:'teacher',method:'POST',body:{...courseData,chapters:[chapter,chapter]},status:400})
        const item = {...lecture,lectureId:'duplicate',lectureOrder:1}
        await request('/api/courses', {user:'teacher',method:'POST',body:{...courseData,chapters:[{...chapter,chapterContent:[item,item]}]},status:400})
    })
    it('creates and edits lectures and rejects unsafe video URLs', async () => {
        const path = '/api/courses/' + courseId + '/chapters/' + chapterId + '/lectures'
        await request(path, { user: 'teacher', method: 'POST', body: { ...lecture, lectureUrl: 'javascript:alert(1)' }, status: 400 })
        const result = await request(path, { user: 'teacher', method: 'POST', body: lecture, status: 201 })
        lectureId = result.course.chapters[0].chapterContent[0].lectureId
        await request(path + '/' + lectureId, { user: 'teacher', method: 'PUT', body: { lectureTitle: 'React introduction' } })
        await request(path, { user: 'teacher', method: 'POST', body: { ...lecture, lectureTitle: 'Free preview', isPreviewFree: true }, status: 201 })
    })
    it('publishes, searches literally, and redacts private lectures and user details', async () => {
        await request('/api/courses/' + courseId, { user: 'teacher', method: 'PUT', body: { isPublished: true } })
        const found = (await request('/api/courses?search=' + encodeURIComponent('[Foundations]'))).courses
        assert.equal(found.length, 1)
        assert.equal((await request('/api/courses?search=' + encodeURIComponent('.*'))).courses.length, 0)
        assert.equal(found[0].educator.name, 'teacher Test')
        assert.equal(found[0].educator.email, undefined)
        assert.equal(found[0].chapters[0].chapterContent[0].lectureUrl, undefined)
        assert.ok(found[0].chapters[0].chapterContent[1].lectureUrl)
        const detail = (await request('/api/courses/' + courseId)).course
        assert.equal(detail.chapters[0].chapterContent[0].lectureUrl, undefined)
        const privateLecture = await request('/api/courses/' + courseId + '/chapters/' + chapterId + '/lectures/' + lectureId)
        assert.equal(privateLecture.lecture.lectureUrl, undefined)
    })
    it('blocks progress and ratings before enrollment', async () => {
        await request('/api/enrollments/' + courseId + '/progress/' + lectureId, { user: 'outsider', method: 'PUT', status: 403 })
        await request('/api/enrollments/' + courseId + '/rating', { user: 'outsider', method: 'PUT', body: { rating: 5 }, status: 403 })
    })
    it('enrolls once despite duplicate and concurrent enrollment requests', async () => {
        await request('/api/enrollments/' + courseId, { user: 'student', method: 'POST' })
        await Promise.all(Array.from({ length: 3 }, () => request('/api/enrollments/' + courseId, { user: 'student', method: 'POST' })))
        assert.equal(await Enrollment.countDocuments({ user: 'student', course: courseId }), 1)
        await request('/api/enrollments/' + courseId, { user: 'teacher', method: 'POST', status: 400 })
    })
    it('grants enrolled video access and persists idempotent lecture completion', async () => {
        const enrolled = (await request('/api/enrollments', { user: 'student' })).courses
        assert.equal(enrolled.length, 1)
        assert.equal(enrolled[0].chapters[0].chapterContent[0].lectureUrl, lecture.lectureUrl)
        assert.equal((await request('/api/courses/' + courseId, { user: 'student' })).course.isEnrolled, true)
        await request('/api/enrollments/' + courseId + '/progress/missing', { user: 'student', method: 'PUT', status: 404 })
        for (let i = 0; i < 2; i++) await request('/api/enrollments/' + courseId + '/progress/' + lectureId, { user: 'student', method: 'PUT' })
        assert.deepEqual((await request('/api/enrollments', { user: 'student' })).courses[0].completedLectures, [lectureId])
    })
    it('updates an existing rating without double counting it', async () => {
        await request('/api/enrollments/' + courseId + '/rating', { user: 'student', method: 'PUT', body: { rating: 6 }, status: 400 })
        for (const rating of [4, 5]) await request('/api/enrollments/' + courseId + '/rating', { user: 'student', method: 'PUT', body: { rating } })
        const course = (await request('/api/courses/' + courseId)).course
        assert.equal(course.averageRating, 5)
        assert.equal(course.ratingCount, 1)
        assert.equal(course.enrollmentCount, 1)
    })
    it('returns real dashboard and enrollment data only for the owning educator', async () => {
        const dashboard = (await request('/api/educator/dashboard', { user: 'teacher' })).dashboard
        assert.equal(dashboard.totalCourses, 1)
        assert.equal(dashboard.totalEnrollments, 1)
        assert.equal(dashboard.publishedCourses, 1)
        assert.equal((await request('/api/educator/students', { user: 'teacher' })).students[0].student.name, 'Learner Test')
        assert.equal((await request('/api/educator/courses', { user: 'other' })).courses.length, 0)
    })
    it('unpublishes while retaining access for enrolled students and prevents destructive deletion', async () => {
        await request('/api/courses/' + courseId, { user: 'teacher', method: 'DELETE', status: 409 })
        await request('/api/courses/' + courseId, { user: 'teacher', method: 'PUT', body: { isPublished: false } })
        await request('/api/courses/' + courseId, { status: 404 })
        await request('/api/enrollments/' + courseId, { user: 'outsider', method: 'POST', status: 404 })
        assert.equal((await request('/api/enrollments', { user: 'student' })).courses.length, 1)
        assert.ok((await request('/api/courses/' + courseId, { user: 'student' })).course.chapters[0].chapterContent[0].lectureUrl)
    })
    it('deletes lectures and chapters and deletes a course without enrollments', async () => {
        const root = '/api/courses/' + courseId + '/chapters/' + chapterId
        await request(root + '/lectures/' + lectureId, { user: 'teacher', method: 'DELETE' })
        await request(root, { user: 'teacher', method: 'DELETE' })
        const disposable = (await request('/api/courses', { user: 'teacher', method: 'POST', body: courseData, status: 201 })).course
        await request('/api/courses/' + disposable._id, { user: 'teacher', method: 'DELETE' })
        assert.equal(await Course.findById(disposable._id), null)
    })
    it('promotes only the current user through the educator workflow and handles role revocation', async () => {
        await request('/api/educator/update-role', { user: 'outsider', method: 'POST', body: { userId: 'student' } })
        assert.equal(profiles.outsider.publicMetadata.role, 'educator')
        assert.equal(profiles.student.publicMetadata.role, 'student')
        profiles.outsider.publicMetadata.role = 'student'
        await request('/api/educator/dashboard', { user: 'outsider', status: 403 })
    })
    it('verifies exact webhook bytes, accepts retries and unknown events, rejects bad signatures', async () => {
        const secret = 'whsec_' + Buffer.from('learnova-test-secret').toString('base64')
        process.env.CLERK_WEBHOOK_SECRET = secret
        const sendEvent = async (event, valid = true) => {
            const body = JSON.stringify(event, null, 2)
            const id = 'msg_' + randomUUID()
            const time = new Date()
            const signature = new Webhook(secret).sign(id, time, body)
            const response = await fetch(base + '/clerk', { method: 'POST', body,
                headers: { 'Content-Type': 'application/json', 'svix-id': id, 'svix-timestamp': String(Math.floor(time.getTime() / 1000)), 'svix-signature': valid ? signature : 'v1,invalid' } })
            assert.equal(response.status, valid ? 200 : 400)
        }
        const event = { type: 'user.created', data: { id: 'webhook-user', first_name: null, last_name: null, email_addresses: [] } }
        await sendEvent(event)
        await sendEvent(event)
        assert.equal(await User.countDocuments({ _id: 'webhook-user' }), 1)
        await sendEvent({ type: 'unhandled.event', data: {} })
        await sendEvent(event, false)
        await sendEvent({ type: 'user.deleted', data: { id: 'webhook-user' } })
        assert.equal(await User.findById('webhook-user'), null)
    })
    it('parses standard YouTube video URL formats', () => {
        for (const url of ['https://youtu.be/dQw4w9WgXcQ?t=5', 'https://youtube.com/watch?v=dQw4w9WgXcQ&list=abc', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ']) assert.equal(youtubeId(url), 'dQw4w9WgXcQ')
        assert.equal(youtubeId('https://example.com/watch?v=dQw4w9WgXcQ'), null)
        assert.equal(youtubeId('javascript:alert(1)'), null)
    })
})
