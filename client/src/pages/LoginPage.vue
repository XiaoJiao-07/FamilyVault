<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>FamilyVault</h1>
        <p>家史馆</p>
      </div>

      <van-tabs v-model:active="activeTab" shrink>
        <van-tab title="登录">
          <van-form @submit="onLogin">
            <van-cell-group inset>
              <van-field
                v-model="loginForm.username"
                name="username"
                label="用户名"
                placeholder="请输入用户名"
                required
                :rules="[{ required: true, message: '请填写用户名' }]"
              />
              <van-field
                v-model="loginForm.password"
                type="password"
                name="password"
                label="密码"
                placeholder="请输入密码"
                required
                :rules="[{ required: true, message: '请填写密码' }]"
              />
            </van-cell-group>
            <div class="form-actions">
              <van-button round block type="primary" native-type="submit">
                登录
              </van-button>
            </div>
          </van-form>
        </van-tab>

        <van-tab title="注册">
          <van-form @submit="onRegister">
            <van-cell-group inset>
              <van-field
                v-model="registerForm.username"
                name="username"
                label="用户名"
                placeholder="请输入用户名（4-20位）"
                required
                :rules="[
                  { required: true, message: '请填写用户名' },
                  { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: '用户名需为4-20位字母数字下划线' }
                ]"
              />
              <van-field
                v-model="registerForm.displayName"
                name="displayName"
                label="昵称"
                placeholder="请输入昵称"
                required
                :rules="[{ required: true, message: '请填写昵称' }]"
              />
              <van-field
                v-model="registerForm.password"
                type="password"
                name="password"
                label="密码"
                placeholder="请输入密码（6位以上）"
                required
                :rules="[
                  { required: true, message: '请填写密码' },
                  { validator: (val) => val.length >= 6, message: '密码至少6位' }
                ]"
              />
              <van-field
                v-model="registerForm.confirmPassword"
                type="password"
                name="confirmPassword"
                label="确认密码"
                placeholder="请再次输入密码"
                required
                :rules="[
                  { required: true, message: '请确认密码' },
                  { validator: (val) => val === registerForm.password, message: '两次密码不一致' }
                ]"
              />
              <van-field
                v-model="registerForm.invitationCode"
                name="invitationCode"
                label="邀请码"
                placeholder="请输入邀请码"
                required
                :rules="[{ required: true, message: '请填写邀请码' }]"
              />
            </van-cell-group>
            <div class="form-actions">
              <van-button round block type="primary" native-type="submit">
                注册
              </van-button>
            </div>
          </van-form>
        </van-tab>
      </van-tabs>

      <div class="login-footer">
        <p>没有邀请码？联系管理员获取</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { authAPI } from '@/utils/api'

const router = useRouter()
const activeTab = ref(0)

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  invitationCode: ''
})

const onLogin = async () => {
  try {
    const result = await authAPI.login(loginForm.value.username, loginForm.value.password)
    if (result.success) {
      showToast('登录成功')
      router.push('/')
    } else {
      showToast(result.message || '登录失败')
    }
  } catch (err) {
    showToast('登录失败：' + err.message)
  }
}

const onRegister = async () => {
  try {
    const result = await authAPI.register({
      username: registerForm.value.username,
      displayName: registerForm.value.displayName,
      password: registerForm.value.password,
      invitationCode: registerForm.value.invitationCode
    })
    if (result.success) {
      showToast('注册成功，请登录')
      activeTab.value = 0
      loginForm.value.username = registerForm.value.username
      registerForm.value = {
        username: '',
        displayName: '',
        password: '',
        confirmPassword: '',
        invitationCode: ''
      }
    } else {
      showToast(result.message || '注册失败')
    }
  } catch (err) {
    showToast('注册失败：' + err.message)
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 20px;
  padding: 32px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px;
}

.login-header p {
  font-size: 14px;
  color: #8e8e93;
  margin: 0;
}

.form-actions {
  margin: 24px 16px 16px;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.login-footer p {
  font-size: 12px;
  color: #8e8e93;
  margin: 0;
}

:deep(.van-tabs__nav) {
  background: transparent;
}

:deep(.van-tab) {
  font-size: 15px;
  font-weight: 500;
}

:deep(.van-tab--active) {
  color: #007aff;
}

:deep(.van-tabs__line) {
  background: #007aff;
  width: 40px !important;
}

:deep(.van-cell-group--inset) {
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.van-field__label) {
  width: 80px;
  font-size: 14px;
}

:deep(.van-button--primary) {
  background: #007aff;
  border-color: #007aff;
}
</style>
