import { useContext } from 'react'
import { SignInButton, useAuth } from '@clerk/clerk-react'
import { AppContext } from '../context/AppContext'
import Loading from './student/Loading'

export default function ProtectedRoute({ educator = false, children }) {
    const { isLoaded, isSignedIn } = useAuth()
    const { userLoading, userError, isEducator, becomeEducator, roleLoading } = useContext(AppContext)
    if (!isLoaded || (isSignedIn && userLoading)) return <Loading />
    if (!isSignedIn) return <div className="p-8 text-center"><p className="mb-4">Sign in to continue.</p><SignInButton mode="modal"><button className="bg-blue-600 text-white px-5 py-2 rounded">Sign in</button></SignInButton></div>
    if (userError) return <p role="alert" className="p-8 text-red-600">{userError}</p>
    if (educator && !isEducator) return <div className="p-8 text-center"><p className="mb-4">Become an educator to create and manage your courses.</p><button onClick={becomeEducator} disabled={roleLoading} className="bg-blue-600 text-white px-5 py-2 rounded">{roleLoading ? 'Updating role…' : 'Become Educator'}</button></div>
    return children
}
