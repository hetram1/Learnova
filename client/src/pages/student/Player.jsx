import { useContext, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'
import Footer from '../../components/student/Footer'
import Rating from '../../components/student/Rating'
import VideoPlayer from '../../components/student/VideoPlayer'
import Loading from '../../components/student/Loading'

const Player = () => {
    const { courseId } = useParams()
    const { enrolledCourses, enrollmentsLoading, enrollmentsError, api, fetchUserEnrolledCourses, calculateChapterTime } = useContext(AppContext)
    const course = enrolledCourses.find(item => item._id === courseId)
    const [openSections, setOpenSections] = useState({})
    const [selectedId, setSelectedId] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const lectures = course?.chapters.flatMap(chapter => chapter.chapterContent) || []
    const selected = lectures.find(lecture => lecture.lectureId === selectedId) || lectures[0]
    useEffect(() => { setSelectedId(null); setOpenSections({}); setError('') }, [courseId])

    const complete = async () => {
        if (!selected || saving || course.completedLectures.includes(selected.lectureId)) return
        setSaving(true)
        setError('')
        try {
            await api(`/api/enrollments/${courseId}/progress/${selected.lectureId}`, { method: 'PUT' })
            await fetchUserEnrolledCourses()
        } catch (error) { setError(error.message) }
        finally { setSaving(false) }
    }
    const rate = async rating => {
        try {
            await api(`/api/enrollments/${courseId}/rating`, { method: 'PUT', body: JSON.stringify({ rating }) })
            await fetchUserEnrolledCourses()
        } catch (error) { setError(error.message) }
    }
    if (!course && enrollmentsLoading) return <Loading />
    if (!course) return <div className="p-8"><p role="alert">{enrollmentsError || 'Enroll in this course to access its lectures.'}</p><Link className="text-blue-600" to={'/course/' + courseId}>View course</Link></div>
    return <>
        <div className="p-4 sm:p-10 flex flex-col-reverse lg:grid lg:grid-cols-2 gap-10 lg:px-20">
            <div className="text-gray-800 min-w-0">
                <h1 className="text-2xl font-semibold">{course.courseTitle}</h1>
                <h2 className="text-xl font-semibold mt-5">Course Structure</h2>
                <div className="pt-5">{course.chapters.map((chapter, index) => <div key={chapter.chapterId} className="border border-gray-300 bg-white mb-2 rounded">
                    <button className="flex items-center justify-between gap-3 w-full px-4 py-3 text-left" onClick={() => setOpenSections(previous => ({ ...previous, [index]: !previous[index] }))} aria-expanded={Boolean(openSections[index])}>
                        <span className="font-medium">{chapter.chapterTitle}</span>
                        <span className="text-sm">{chapter.chapterContent.length} lectures · {calculateChapterTime(chapter)}</span>
                    </button>
                    {openSections[index] && <ul className="px-4 py-2 border-t">{chapter.chapterContent.map(lecture => <li key={lecture.lectureId}>
                        <button className={`flex gap-2 text-left py-2 w-full ${selected?.lectureId === lecture.lectureId ? 'text-blue-600' : ''}`} onClick={() => setSelectedId(lecture.lectureId)}>
                            <img src={course.completedLectures.includes(lecture.lectureId) ? assets.blue_tick_icon : assets.play_icon} alt={course.completedLectures.includes(lecture.lectureId) ? 'Completed' : 'Play'} className="w-4 h-4 mt-1" />
                            <span>{lecture.lectureTitle}</span>
                        </button>
                    </li>)}</ul>}
                </div>)}</div>
                <div className="flex flex-wrap items-center gap-2 py-3 mt-10"><h2 className="text-xl font-bold">Rate this Course:</h2><Rating key={course.myRating} initialRating={course.myRating} onRate={rate} /></div>
            </div>
            <div className="min-w-0 lg:mt-10">
                {selected ? <>
                    <VideoPlayer url={selected.lectureUrl} onEnded={complete} />
                    <div className="flex gap-3 justify-between items-center mt-3">
                        <p>{selected.lectureTitle}</p>
                        <button disabled={saving || course.completedLectures.includes(selected.lectureId)} onClick={complete} className="text-blue-600 disabled:text-gray-500">
                            {saving ? 'Saving…' : course.completedLectures.includes(selected.lectureId) ? 'Completed' : 'Mark Completed'}
                        </button>
                    </div>
                </> : <p>This course has no lectures.</p>}
                {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
            </div>
        </div>
        <Footer />
    </>
}
export default Player
