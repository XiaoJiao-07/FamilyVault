import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { transcribeAudio } from '../services/whisperService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../data/uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp3|wav|mp4|webm/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('不支持的文件类型'))
    }
  }
})

// 上传音频并转文字
router.post('/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请上传音频文件' })
    }

    const audioPath = req.file.path
    const audioUrl = `/uploads/${req.file.filename}`

    // 调用 Whisper 转文字
    const transcription = await transcribeAudio(audioPath)

    res.json({
      success: true,
      data: {
        audioUrl,
        transcription,
        duration: req.body.duration || 0
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 上传图片
router.post('/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请上传图片文件' })
    }

    const imageUrl = `/uploads/${req.file.filename}`

    res.json({
      success: true,
      data: { imageUrl }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router