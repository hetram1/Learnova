import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import humanizeDuration from 'humanize-duration'

// eslint-disable-next-line react-refresh/only-export-components -- Preserve the existing shared context module.
export const AppContext = createContext()
const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '')
const lectures = course => (course?.chapters || []).flatMap(chapter => chapter.chapterContent)
const duration = minutes => humanizeDuration(minutes * 60000, { units: ['h', 'm'], round: true })

export const AppContextProvider = ({ children }) => {
    const navigate = useNavigate()
    const { getToken, isLoaded, isSignedIn, userId } = useAuth()
    const { user } = useUser()
    const currentUserId = useRef(userId)
    currentUserId.current = userId
    const [allCourses, setAllCourses] = useState([])
    const [enrolledCourses, setEnrolledCourses] = useState([])
    const [userData, setUserData] = useState(null)
    const [coursesLoading, setCoursesLoading] = useState(true)
    const [coursesError, setCoursesError] = useState('')
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(true)
    const [enrollmentsError, setEnrollmentsError] = useState('')
    const [userLoading, setUserLoading] = useState(true)
    const [userError, setUserError] = useState('')
    const [roleLoading, setRoleLoading] = useState(false)

    const api = useCallback(async (path, { authenticated = true, ...options } = {}) => {
        const token = await getToken()
        if (authenticated && !token) throw new Error('Sign in to continue')
        const response = await fetch(backendUrl + path, {
            ...options, headers: {
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers,
            },
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.success) throw new Error(data?.message || 'Could not reach the Learnova API')
        return data
    }, [getToken])

    const fetchAllCourses = useCallback(async () => {
        setCoursesLoading(true)
        setCoursesError('')
        try { setAllCourses((await api('/api/courses', { authenticated: false })).courses) }
        catch (error) { setCoursesError(error.message); setAllCourses([]) }
        finally { setCoursesLoading(false) }
    }, [api])
    const fetchUserEnrolledCourses = useCallback(async () => {
        const requestUserId = userId
        setEnrollmentsLoading(true)
        setEnrollmentsError('')
        try {
            const data = await api('/api/enrollments')
            if (currentUserId.current === requestUserId) setEnrolledCourses(data.courses)
        } catch (error) {
            if (currentUserId.current === requestUserId) { setEnrollmentsError(error.message); setEnrolledCourses([]) }
        } finally { if (currentUserId.current === requestUserId) setEnrollmentsLoading(false) }
    }, [api, userId])
    useEffect(() => { if (isLoaded) fetchAllCourses() }, [isLoaded, fetchAllCourses])
    useEffect(() => {
        let active = true
        setUserData(null)
        setUserError('')
        setEnrolledCourses([])
        if (!isLoaded) return
        if (!isSignedIn) { setUserLoading(false); setEnrollmentsLoading(false); return }
        setUserLoading(true)
        api('/api/users/me').then(data => { if (active) setUserData(data.user) })
            .catch(error => { if (active) setUserError(error.message) })
            .finally(() => { if (active) setUserLoading(false) })
        fetchUserEnrolledCourses()
        return () => { active = false }
    }, [isLoaded, isSignedIn, userId, api, fetchUserEnrolledCourses])
    const becomeEducator = async () => {
        if (!isSignedIn || roleLoading) return
        setRoleLoading(true)
        try {
            await api('/api/educator/update-role', { method: 'POST' })
            await user.reload()
            setUserData((await api('/api/users/me')).user)
            navigate('/educator')
        } catch (error) { alert(error.message) }
        finally { setRoleLoading(false) }
    }
    const value = {
        currency: import.meta.env.VITE_CURRENCY || '₹', navigate, api, allCourses,
        fetchAllCourses, coursesLoading, coursesError, enrolledCourses, fetchUserEnrolledCourses,
        enrollmentsLoading, enrollmentsError, userData, userLoading, userError,
        isEducator: userData?.role === 'educator', becomeEducator, roleLoading,
        calculateRating: course => Number(course.averageRating || 0).toFixed(1),
        calculateChapterTime: chapter => duration(chapter.chapterContent.reduce((sum, lecture) => sum + lecture.lectureDuration, 0)),
        calculateCourseDuration: course => duration(lectures(course).reduce((sum, lecture) => sum + lecture.lectureDuration, 0)),
        calculateNoOfLectures: course => lectures(course).length,
        completedCount: course => lectures(course).filter(lecture => course.completedLectures?.includes(lecture.lectureId)).length,
    }
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
