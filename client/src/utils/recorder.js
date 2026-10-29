/**
 * 录音工具类
 * 使用浏览器 MediaRecorder API 实现录音功能
 */

class AudioRecorder {
  constructor() {
    this.mediaRecorder = null
    this.audioChunks = []
    this.stream = null
    this.startTime = null
    this.duration = 0
    this.timer = null
    this.onDurationUpdate = null
  }

  /**
   * 检查浏览器是否支持录音
   */
  isSupported() {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  }

  /**
   * 请求麦克风权限并开始录音
   */
  async start() {
    if (!this.isSupported()) {
      throw new Error('您的浏览器不支持录音功能')
    }

    try {
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      // 创建 MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.getSupportedMimeType()
      })

      this.audioChunks = []
      this.startTime = Date.now()
      this.duration = 0

      // 监听数据可用事件
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      // 监听录音停止事件
      this.mediaRecorder.onstop = () => {
        this.stopStream()
        this.stopTimer()
      }

      // 开始录音
      this.mediaRecorder.start(1000) // 每秒收集一次数据

      // 启动计时器
      this.startTimer()

      return true
    } catch (error) {
      console.error('录音启动失败:', error)
      if (error.name === 'NotAllowedError') {
        throw new Error('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风')
      }
      throw error
    }
  }

  /**
   * 停止录音
   * @returns {Blob} 录音文件
   */
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('录音未开始'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.getSupportedMimeType()
        })

        const duration = this.duration
        this.audioChunks = []

        resolve({
          blob: audioBlob,
          duration: duration,
          type: this.getSupportedMimeType()
        })
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * 暂停录音
   */
  pause() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause()
      this.stopTimer()
    }
  }

  /**
   * 恢复录音
   */
  resume() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume()
      this.startTimer()
    }
  }

  /**
   * 获取录音状态
   */
  getState() {
    if (!this.mediaRecorder) return 'inactive'
    return this.mediaRecorder.state
  }

  /**
   * 获取当前录音时长（秒）
   */
  getDuration() {
    return this.duration
  }

  /**
   * 将 Blob 转换为 File
   */
  blobToFile(blob, filename) {
    return new File([blob], filename, {
      type: blob.type,
      lastModified: Date.now()
    })
  }

  /**
   * 获取支持的 MIME 类型
   */
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'audio/webm'
  }

  /**
   * 启动计时器
   */
  startTimer() {
    this.timer = setInterval(() => {
      this.duration = Math.floor((Date.now() - this.startTime) / 1000)
      if (this.onDurationUpdate) {
        this.onDurationUpdate(this.duration)
      }
    }, 1000)
  }

  /**
   * 停止计时器
   */
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * 停止并释放音频流
   */
  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
  }

  /**
   * 销毁录音器
   */
  destroy() {
    this.stopStream()
    this.stopTimer()
    this.mediaRecorder = null
    this.audioChunks = []
  }
}

// 导出单例
export const audioRecorder = new AudioRecorder()
export default audioRecorder