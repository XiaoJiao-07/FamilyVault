import axios from 'axios'

// 创建 axios 实例
const request = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('API 请求失败:', error)
    return Promise.reject(error)
  }
)

/**
 * 采访相关 API
 */
export const interviewApi = {
  // 获取所有采访对象
  getInterviewees() {
    return request.get('/interview/interviewees')
  },

  // 创建采访对象
  createInterviewee(data) {
    return request.post('/interview/interviewees', data)
  },

  // 开始采访会话
  startSession(intervieweeId) {
    return request.post('/interview/sessions/start', { intervieweeId })
  },

  // 获取会话消息
  getSessionMessages(sessionId) {
    return request.get(`/interview/sessions/${sessionId}/messages`)
  },

  // 发送消息
  sendMessage(sessionId, data) {
    return request.post(`/interview/sessions/${sessionId}/messages`, data)
  },

  // 结束会话
  endSession(sessionId) {
    return request.post(`/interview/sessions/${sessionId}/end`)
  }
}

/**
 * 上传相关 API
 */
export const uploadApi = {
  // 上传音频并转文字
  uploadAudio(audioFile, duration) {
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('duration', duration)

    return request.post('/upload/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000 // 音频上传可能需要更长时间
    })
  },

  // 上传图片
  uploadImage(imageFile) {
    const formData = new FormData()
    formData.append('image', imageFile)

    return request.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

/**
 * 图谱相关 API
 */
export const graphApi = {
  // 获取完整图谱数据
  getFullGraph() {
    return request.get('/graph/full')
  },

  // 获取家族成员
  getMembers() {
    return request.get('/graph/members')
  },

  // 获取家族关系
  getRelationships() {
    return request.get('/graph/relationships')
  },

  // 添加家族成员
  addMember(data) {
    return request.post('/graph/members', data)
  },

  // 添加家族关系
  addRelationship(data) {
    return request.post('/graph/relationships', data)
  }
}

/**
 * 时光胶囊 API
 */
export const capsuleApi = {
  // 创建胶囊
  createCapsule(data) {
    return request.post('/capsule', data)
  },

  // 获取所有胶囊
  getCapsules() {
    return request.get('/capsule')
  },

  // 解锁胶囊
  unlockCapsule(id) {
    return request.post(`/capsule/${id}/unlock`)
  }
}

export default {
  interview: interviewApi,
  upload: uploadApi,
  graph: graphApi,
  capsule: capsuleApi
}