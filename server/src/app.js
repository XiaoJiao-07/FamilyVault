import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
dotenv.config()

// Import routes
import interviewRoutes from './routes/interview.js'
import graphRoutes from './routes/graph.js'
import capsuleRoutes from './routes/capsule.js'
import uploadRoutes from './routes/upload.js'

// Import database
import { initDatabase } from './models/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../../data/uploads')))

// Initialize database
initDatabase()

// Routes
app.use('/api/interview', interviewRoutes)
app.use('/api/graph', graphRoutes)
app.use('/api/capsule', capsuleRoutes)
app.use('/api/upload', uploadRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FamilyVault Server running on http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app