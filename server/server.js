import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import app from './app.js'
import connectDB from './configs/mongodb.js'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await connectDB()
    app.listen(process.env.PORT || 5000, () => console.log('Learnova API is running'))
}
export default app
