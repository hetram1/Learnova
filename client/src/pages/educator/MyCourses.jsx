import { useCallback, useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading'

const MyCourses = () => {
    const { api, fetchAllCourses } = useContext(AppContext)
    const [courses, setCourses] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(null)
    const load = useCallback(async () => {
        try { setCourses((await api('/api/educator/courses')).courses) }
        catch (error) { setError(error.message) }
    }, [api])
    useEffect(() => { load() }, [load])
    const change = async (course, remove = false) => {
        setBusy(course._id)
        setError('')
        try {
            await api('/api/courses/' + course._id, remove ? { method: 'DELETE' } :
                { method: 'PUT', body: JSON.stringify({ isPublished: !course.isPublished }) })
            await load()
            await fetchAllCourses()
        } catch (error) { setError(error.message) }
        finally { setBusy(null) }
    }
    if (!courses && !error) return <Loading />
    return <div className="md:p-8 p-4 min-h-screen">
        <h1 className="pb-4 text-lg font-medium">My Courses</h1>
        {error && <p role="alert" className="mb-4 text-red-600">{error}</p>}
        {courses?.length === 0 && <p>No courses yet. <Link className="text-blue-600" to="/educator/add-course">Create a course</Link></p>}
        <div className="max-w-5xl overflow-x-auto rounded-md border border-gray-500/20">
            <table className="w-full text-left text-sm">
                <thead className="border-b"><tr><th className="p-3">Course</th><th className="p-3">Students</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                <tbody>{courses?.map(course => <tr key={course._id} className="border-b">
                    <td className="p-3"><Link to={'/course/' + course._id} className="flex items-center gap-3">{course.courseThumbnail && <img src={course.courseThumbnail} alt="" className="w-16 aspect-video object-cover hidden sm:block" />}<span>{course.courseTitle}</span></Link></td>
                    <td className="p-3">{course.enrollmentCount}</td>
                    <td className="p-3">{course.isPublished ? 'Published' : 'Draft'}</td>
                    <td className="p-3"><div className="flex flex-wrap gap-3">
                        <Link className="text-blue-600" to={'/educator/edit-course/' + course._id}>Edit</Link>
                        <button disabled={busy === course._id} onClick={() => change(course)} className="text-blue-600 disabled:text-gray-400">{course.isPublished ? 'Unpublish' : 'Publish'}</button>
                        {!course.enrollmentCount && <button disabled={busy === course._id} onClick={() => change(course, true)} className="text-red-600 disabled:text-gray-400">Delete</button>}
                    </div></td>
                </tr>)}</tbody>
            </table>
        </div>
    </div>
}
export default MyCourses
