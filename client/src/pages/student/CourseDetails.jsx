import { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth, useClerk } from '@clerk/clerk-react'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'
import Loading from '../../components/student/Loading'
import Footer from '../../components/student/Footer'
import VideoPlayer from '../../components/student/VideoPlayer'
import RichText from '../../components/student/RichText'

const CourseDetails = () => {
    const { id } = useParams()
    const { isSignedIn } = useAuth()
    const { openSignIn } = useClerk()
    const { api, navigate, userData, fetchUserEnrolledCourses, calculateRating, calculateNoOfLectures,
        calculateCourseDuration, calculateChapterTime, currency } = useContext(AppContext)
    const [course, setCourse] = useState(null)
    const [openSections, setOpenSections] = useState({})
    const [previewUrl, setPreviewUrl] = useState(null)
    const [loading, setLoading] = useState(true)
    const [enrolling, setEnrolling] = useState(false)
    const [error, setError] = useState('')
    useEffect(() => {
        let active = true
        setLoading(true)
        setCourse(null)
        setError('')
        setPreviewUrl(null)
        api('/api/courses/' + id, { authenticated: false }).then(data => { if (active) setCourse(data.course) })
            .catch(error => { if (active) setError(error.message) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [id, api, isSignedIn])
    const enroll = async () => {
        if (!isSignedIn) return openSignIn()
        if (course.isEnrolled) return navigate('/player/' + id)
        setEnrolling(true)
        setError('')
        try {
            await api('/api/enrollments/' + id, { method: 'POST' })
            await fetchUserEnrolledCourses()
            navigate('/player/' + id)
        } catch (error) { setError(error.message) }
        finally { setEnrolling(false) }
    }
    if (loading) return <Loading />
    if (!course) return <p role="alert" className="p-8 text-red-600">{error || 'Course not found'}</p>
    const owner = course.educator?._id === userData?._id && Boolean(userData)
    return <>
        <div className="flex lg:flex-row flex-col-reverse gap-10 items-start justify-between lg:px-24 px-5 pt-12 text-left">
            <div className="max-w-xl w-full min-w-0 text-gray-500">
                <h1 className="md:text-course-details-heading-large text-course-details-heading-small font-semibold text-gray-800">{course.courseTitle}</h1>
                <div className="flex flex-wrap items-center gap-2 pt-3 pb-1 text-sm">
                    <p>{calculateRating(course)}</p>
                    <div className="flex">{Array.from({ length: 5 }, (_, i) => <img key={i} src={i < Math.floor(calculateRating(course)) ? assets.star : assets.star_blank} alt="" className="w-3.5 h-3.5" />)}</div>
                    <p className="text-blue-600">({course.ratingCount} ratings)</p>
                    <p>{course.enrollmentCount} students</p>
                </div>
                <p className="text-sm">Course by <span className="text-blue-600">{course.educator?.name || 'Educator'}</span></p>
                <p className="text-sm mt-2">{course.courseCategory}</p>
                <div className="pt-8 text-gray-800">
                    <h2 className="text-xl font-semibold">Course Structure</h2>
                    <div className="pt-5">{course.chapters.map((chapter, index) => <div key={chapter.chapterId} className="border border-gray-300 bg-white mb-2 rounded">
                        <button className="flex items-center justify-between gap-3 px-4 py-3 w-full text-left" aria-expanded={Boolean(openSections[index])} onClick={() => setOpenSections(previous => ({ ...previous, [index]: !previous[index] }))}>
                            <span className="flex items-center gap-2"><img className={`transition-transform ${openSections[index] ? 'rotate-180' : ''}`} src={assets.down_arrow_icon} alt="" /><span className="font-medium">{chapter.chapterTitle}</span></span>
                            <span className="text-sm">{chapter.chapterContent.length} lectures · {calculateChapterTime(chapter)}</span>
                        </button>
                        {openSections[index] && <ul className="px-4 py-2 text-gray-600 border-t border-gray-300">{chapter.chapterContent.map(lecture => <li key={lecture.lectureId} className="flex items-start gap-2 py-2 text-sm">
                            <img src={assets.play_icon} alt="" className="w-4 h-4 mt-1" />
                            <span className="flex-1">{lecture.lectureTitle}</span>
                            {lecture.lectureUrl && (lecture.isPreviewFree || owner) && <button onClick={() => setPreviewUrl(lecture.lectureUrl)} className="text-blue-600">{owner ? 'Watch' : 'Preview'}</button>}
                            <span>{lecture.lectureDuration} min</span>
                        </li>)}</ul>}
                    </div>)}</div>
                </div>
                <div className="py-12"><h2 className="text-xl font-semibold text-gray-800">Course Description</h2><RichText className="pt-3" html={course.courseDescription} /></div>
            </div>
            <div className="w-full lg:w-[420px] lg:shrink-0 shadow-custom-card overflow-hidden bg-white">
                {previewUrl ? <VideoPlayer url={previewUrl} /> : course.courseThumbnail && <img className="w-full aspect-video object-cover" src={course.courseThumbnail} alt="" />}
                <div className="p-5">
                    <div className="flex gap-3 items-center pt-2">
                        <p className="text-gray-800 md:text-4xl text-2xl font-semibold">{currency}{(course.coursePrice * (1 - course.discount / 100)).toFixed(2)}</p>
                        {course.discount > 0 && <><p className="text-gray-500 line-through">{currency}{course.coursePrice}</p><p className="text-gray-500">{course.discount}% off</p></>}
                    </div>
                    <div className="flex flex-wrap text-sm gap-4 pt-4 text-gray-500"><span>{calculateCourseDuration(course)}</span><span>{calculateNoOfLectures(course)} lessons</span></div>
                    {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
                    <button onClick={owner ? () => navigate('/educator/edit-course/' + id) : enroll} disabled={enrolling} className="mt-6 w-full py-3 rounded bg-blue-600 text-white font-medium">
                        {owner ? 'Edit Course' : enrolling ? 'Enrolling…' : course.isEnrolled ? 'Continue Learning' : 'Enroll Now'}
                    </button>
                    <div className="pt-6"><p className="text-lg font-medium text-gray-800">What's in the course?</p><ul className="ml-4 pt-2 text-sm list-disc text-gray-500"><li>Structured chapters and video lectures.</li><li>Track your learning progress.</li><li>Access your enrolled courses from your dashboard.</li></ul></div>
                </div>
            </div>
        </div>
        <Footer />
    </>
}
export default CourseDetails
