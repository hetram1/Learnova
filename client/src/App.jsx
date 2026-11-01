import { Route, Routes, useMatch } from 'react-router-dom'
import CourseDetails from './pages/student/CourseDetails'
import CoursesList from './pages/student/CoursesList'
import Home from './pages/student/Home'
import MyEnrollments from './pages/student/MyEnrollments'
import Player from './pages/student/Player'
import ProtectedRoute from './components/ProtectedRoute'
import Educator from './pages/educator/Educator'
import Dashboard from './pages/educator/Dashboard'
import AddCourse from './pages/educator/AddCourse'
import MyCourses from './pages/educator/MyCourses'
import StudentsEnrolled from './pages/educator/StudentsEnrolled'
import Navbar from './components/student/Navbar'
import "quill/dist/quill.snow.css";


const App = () => {

  const isEducatorRoute = useMatch('/educator/*')


  return (
    <div className='text-default min-h-screen bg-white'>
      {!isEducatorRoute &&  <Navbar/>}
     
      <Routes>
        <Route path='/' element={<Home />}/>
        <Route path='/course-list' element={ <CoursesList/> }/>
        <Route path='/course-list/:input' element={ <CoursesList/> }/>
        <Route path='/course/:id' element={<CourseDetails/>}/>
        <Route path='/my-enrollments' element={<ProtectedRoute><MyEnrollments/></ProtectedRoute>}/>
        <Route path='/player/:courseId' element={<ProtectedRoute><Player/></ProtectedRoute>} />

        
        {/* For Educator */}

        <Route path='/educator' element={<ProtectedRoute educator><Educator/></ProtectedRoute>}>
            <Route index element={<Dashboard/>} />
            <Route path='add-course' element = {<AddCourse/>} />
            <Route path='edit-course/:id' element={<AddCourse/>} />
            <Route path='my-courses' element = {<MyCourses/>} />
            <Route path='student-enrolled' element = {<StudentsEnrolled/>} />
        </Route>



        <Route path='*' element={<p className='p-8'>Page not found.</p>} />
      </Routes>
    </div>
  )
}

export default App
