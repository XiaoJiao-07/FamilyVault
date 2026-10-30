// 语音识别工具 - 使用浏览器原生 Web Speech API

class SpeechRecognizer {
  constructor() {
    this.recognition = null
    this.isListening = false
    this.transcript = '' // 累积的转写文本
    this.onResult = null
    this.onError = null
    this.onEnd = null
    this.onStart = null

    this.init()
  }

  init() {
    // 检查浏览器支持
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('浏览器不支持语音识别')
      return
    }

    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true // 持续识别
    this.recognition.interimResults = true // 显示中间结果
    this.recognition.lang = 'zh-CN' // 中文识别
    this.recognition.maxAlternatives = 1 // 只返回最佳结果

    // 监听识别结果
    this.recognition.onresult = (event) => {
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        
        if (result.isFinal) {
          this.transcript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      // 回调：传入最终结果和中间结果
      if (this.onResult) {
        this.onResult({
          final: this.transcript.trim(),
          interim: interimTranscript,
          full: (this.transcript + interimTranscript).trim()
        })
      }
    }

    // 监听错误
    this.recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error)
      this.isListening = false
      if (this.onError) {
        this.onError(event.error, event.message)
      }
    }

    // 监听结束
    this.recognition.onend = () => {
      console.log('语音识别结束')
      this.isListening = false
      if (this.onEnd) {
        this.onEnd(this.transcript.trim())
      }
    }

    // 监听开始
    this.recognition.onstart = () => {
      console.log('语音识别开始')
      this.isListening = true
      this.transcript = '' // 重置累积文本
      if (this.onStart) {
        this.onStart()
      }
    }
  }

  // 开始识别
  start() {
    if (!this.recognition) {
      throw new Error('语音识别未初始化，请使用 Chrome 或 Edge 浏览器')
    }

    if (this.isListening) {
      console.warn('语音识别已在运行')
      return
    }

    try {
      this.transcript = '' // 重置
      this.recognition.start()
    } catch (err) {
      console.error('启动语音识别失败:', err)
      throw err
    }
  }

  // 停止识别
  stop() {
    if (!this.recognition || !this.isListening) {
      return this.transcript.trim()
    }

    this.recognition.stop()
    return this.transcript.trim()
  }

  // 取消识别
  abort() {
    if (!this.recognition) {
      return
    }

    this.recognition.abort()
    this.isListening = false
  }

  // 获取当前转写文本
  getTranscript() {
    return this.transcript.trim()
  }

  // 检查是否支持
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }
}

// 创建单例
let instance = null

export function getSpeechRecognizer() {
  if (!instance) {
    instance = new SpeechRecognizer()
  }
  return instance
}

// 默认导出
const speechRecognizer = getSpeechRecognizer()
export default speechRecognizer
