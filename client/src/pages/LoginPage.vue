<template>
  <div class="login-page">
    <div class="paper-lines" aria-hidden="true"></div>

    <main class="login-card">
      <header class="brand">
        <!-- 品牌记号：回纹印（寓意世代绵延） -->
        <svg class="seal" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="seal-plate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#C65B3E" />
              <stop offset="1" stop-color="#A03826" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="96" height="96" rx="20" fill="url(#seal-plate)" />
          <polyline
            points="30,72 72,72 72,28 28,28 28,59.5 59.5,59.5 59.5,40.5 40.5,40.5 40.5,47.5 47.5,47.5"
            fill="none"
            stroke="#FFF6EA"
            stroke-width="6.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <h1 class="brand-title">家史馆</h1>
        <p class="brand-en">FAMILY VAULT</p>
        <p class="brand-slogan">趁老人还能说，把家族故事留下来</p>
      </header>

      <div class="seg" role="tablist" aria-label="登录或注册">
        <button
          id="tab-login"
          class="seg-btn"
          :class="{ 'is-on': activeTab === 0 }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 0"
          aria-controls="panel-login"
          @click="switchTab(0)"
        >
          登录
        </button>
        <button
          id="tab-register"
          class="seg-btn"
          :class="{ 'is-on': activeTab === 1 }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 1"
          aria-controls="panel-register"
          @click="switchTab(1)"
        >
          注册
        </button>
        <span class="seg-thumb" :class="{ 'is-right': activeTab === 1 }" aria-hidden="true"></span>
      </div>

      <p v-if="errorMsg" class="alert" role="alert">
        <van-icon name="warning-o" class="alert-icon" />
        <span>{{ errorMsg }}</span>
      </p>

      <!-- 登录 -->
      <div v-show="activeTab === 0" id="panel-login" role="tabpanel" aria-labelledby="tab-login">
        <van-form ref="loginFormRef" class="auth-form" @submit="onLogin">
          <van-field
            v-model="loginForm.username"
            class="fx-field"
            name="username"
            label="用户名"
            label-align="top"
            placeholder="请输入用户名"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            :rules="[{ required: true, message: '请输入用户名' }]"
          />
          <van-field
            v-model="loginForm.password"
            class="fx-field"
            name="password"
            :type="showLoginPwd ? 'text' : 'password'"
            label="密码"
            label-align="top"
            placeholder="请输入密码"
            autocomplete="current-password"
            :rules="[{ required: true, message: '请输入密码' }]"
            @keyup.enter="submitLogin"
          >
            <template #right-icon>
              <button
                class="eye"
                type="button"
                :aria-label="showLoginPwd ? '隐藏密码' : '显示密码'"
                :aria-pressed="showLoginPwd"
                @click="showLoginPwd = !showLoginPwd"
              >
                <van-icon :name="showLoginPwd ? 'eye-o' : 'closed-eye'" />
              </button>
            </template>
          </van-field>

          <van-button
            class="submit"
            round
            block
            native-type="submit"
            :loading="submitting"
            loading-text="登录中…"
          >
            进入家史馆
          </van-button>

          <p class="inline-tip">
            <button class="link" type="button" @click="onForgotPassword">忘记密码？</button>
          </p>
        </van-form>
      </div>

      <!-- 注册 -->
      <div v-show="activeTab === 1" id="panel-register" role="tabpanel" aria-labelledby="tab-register">
        <van-form ref="registerFormRef" class="auth-form" @submit="onRegister">
          <van-field
            v-model="registerForm.username"
            class="fx-field"
            name="username"
            label="用户名"
            label-align="top"
            placeholder="4-20 位字母、数字或下划线"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            :rules="[
              { required: true, message: '请输入用户名' },
              { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: '用户名需为 4-20 位字母、数字或下划线' }
            ]"
          />
          <van-field
            v-model="registerForm.displayName"
            class="fx-field"
            name="displayName"
            label="昵称"
            label-align="top"
            placeholder="家人怎么称呼你"
            maxlength="20"
            :rules="[{ required: true, message: '请输入昵称' }]"
          />
          <van-field
            v-model="registerForm.password"
            class="fx-field"
            name="password"
            :type="showRegisterPwd ? 'text' : 'password'"
            label="密码"
            label-align="top"
            placeholder="至少 6 位"
            autocomplete="new-password"
            :rules="[
              { required: true, message: '请输入密码' },
              { validator: (val) => val.length >= 6, message: '密码至少 6 位' }
            ]"
          >
            <template #right-icon>
              <button
                class="eye"
                type="button"
                :aria-label="showRegisterPwd ? '隐藏密码' : '显示密码'"
                :aria-pressed="showRegisterPwd"
                @click="showRegisterPwd = !showRegisterPwd"
              >
                <van-icon :name="showRegisterPwd ? 'eye-o' : 'closed-eye'" />
              </button>
            </template>
          </van-field>
          <van-field
            v-model="registerForm.confirmPassword"
            class="fx-field"
            name="confirmPassword"
            :type="showRegisterPwd ? 'text' : 'password'"
            label="确认密码"
            label-align="top"
            placeholder="请再次输入密码"
            autocomplete="new-password"
            :rules="[
              { required: true, message: '请确认密码' },
              { validator: (val) => val === registerForm.password, message: '两次密码不一致' }
            ]"
          />
          <van-field
            v-model="registerForm.invitationCode"
            class="fx-field"
            name="invitationCode"
            label="邀请码"
            label-align="top"
            placeholder="8 位邀请码，由家族管理员提供"
            maxlength="16"
            autocomplete="one-time-code"
            autocapitalize="characters"
            :formatter="formatInviteCode"
            :rules="[{ required: true, message: '请输入邀请码' }]"
          />

          <van-button
            class="submit"
            round
            block
            native-type="submit"
            :loading="submitting"
            loading-text="创建中…"
          >
            创建家族档案
          </van-button>
        </van-form>
      </div>

      <footer class="card-foot">
        <p class="foot-primary">
          <template v-if="activeTab === 1">还没有邀请码？联系家族管理员获取</template>
          <template v-else>家族成员凭邀请码加入，数据不对外公开</template>
        </p>
        <p v-if="activeTab === 1" class="foot-hint">
          首次部署时，初始邀请码会打印在服务端启动日志中
        </p>
        <p class="foot-privacy">
          <van-icon name="shield-o" />
          <span>家史内容仅保存在你部署的服务器上</span>
        </p>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { authAPI } from '@/utils/api'

const router = useRouter()

const activeTab = ref(0)
const errorMsg = ref('')
const submitting = ref(false)
const showLoginPwd = ref(false)
const showRegisterPwd = ref(false)

const loginFormRef = ref(null)
const registerFormRef = ref(null)

const loginForm = ref({ username: '', password: '' })
const registerForm = ref({
  username: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  invitationCode: ''
})

const switchTab = (index) => {
  if (submitting.value || activeTab.value === index) return
  activeTab.value = index
  errorMsg.value = ''
}

// 输入即清除上一次的错误提示
watch(
  [loginForm, registerForm],
  () => {
    if (errorMsg.value) errorMsg.value = ''
  },
  { deep: true }
)

const formatInviteCode = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')

const submitLogin = () => loginFormRef.value?.submit?.()
const submitRegister = () => registerFormRef.value?.submit?.()

const onLogin = async () => {
  if (submitting.value) return
  errorMsg.value = ''
  submitting.value = true
  try {
    const result = await authAPI.login(loginForm.value.username.trim(), loginForm.value.password)
    if (result.success) {
      showToast(`欢迎回来，${result.user?.displayName || '家人'}`)
      await router.replace('/')
      return
    }
    errorMsg.value = result.message || '登录失败，请稍后重试'
  } catch (err) {
    errorMsg.value = err?.message || '网络异常，请确认服务已启动'
  } finally {
    submitting.value = false
  }
}

const onRegister = async () => {
  if (submitting.value) return
  errorMsg.value = ''
  submitting.value = true
  try {
    const result = await authAPI.register({
      username: registerForm.value.username.trim(),
      displayName: registerForm.value.displayName.trim(),
      password: registerForm.value.password,
      invitationCode: formatInviteCode(registerForm.value.invitationCode)
    })
    if (result.success) {
      showToast('注册成功，欢迎加入')
      await router.replace('/')
      return
    }
    errorMsg.value = result.message || '注册失败，请稍后重试'
  } catch (err) {
    errorMsg.value = err?.message || '网络异常，请确认服务已启动'
  } finally {
    submitting.value = false
  }
}

const onForgotPassword = () => {
  showToast({
    message: '请联系家族管理员重置密码',
    position: 'bottom',
    duration: 2500
  })
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 18px calc(28px + env(safe-area-inset-bottom));
  background:
    radial-gradient(120% 70% at 50% -8%, #fffbf2 0%, rgba(255, 251, 242, 0) 62%),
    radial-gradient(80% 55% at 100% 102%, rgba(201, 154, 91, 0.18), rgba(201, 154, 91, 0) 62%),
    #f5eee3;
  overflow-x: hidden;
}

/* 旧账本纸面的竖线纹理 */
.paper-lines {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    90deg,
    rgba(43, 33, 25, 0.035) 0 1px,
    transparent 1px 26px
  );
  -webkit-mask-image: radial-gradient(120% 80% at 50% 40%, #000 35%, transparent 100%);
  mask-image: radial-gradient(120% 80% at 50% 40%, #000 35%, transparent 100%);
  pointer-events: none;
}

.login-card {
  position: relative;
  width: 100%;
  max-width: 400px;
  padding: 30px 22px 20px;
  background: #fffdf8;
  border: 1px solid #eadfcd;
  border-radius: 24px;
  box-shadow:
    0 24px 60px -28px rgba(74, 52, 36, 0.45),
    0 2px 6px rgba(74, 52, 36, 0.05);
  animation: card-in 0.5s cubic-bezier(0.22, 0.9, 0.28, 1) both;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 品牌区 */
.brand {
  text-align: center;
  margin-bottom: 22px;
}

.seal {
  display: block;
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  filter: drop-shadow(0 10px 16px rgba(156, 56, 38, 0.35));
  transform: rotate(-2deg);
}

.brand-title {
  margin: 0;
  font-family: 'Songti SC', 'STSong', 'SimSun', serif;
  font-size: 25px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-indent: 0.22em;
  color: #2b2119;
}

.brand-en {
  margin: 6px 0 0;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.34em;
  text-indent: 0.34em;
  color: #b9a089;
}

.brand-slogan {
  margin: 10px 0 0;
  font-size: 13px;
  color: #8e7c69;
}

/* 分段控件 */
.seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  margin-bottom: 16px;
  background: #f2e8d9;
  border-radius: 13px;
}

.seg-btn {
  position: relative;
  z-index: 1;
  padding: 9px 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  color: #9a8a78;
  cursor: pointer;
  transition: color 0.18s ease;
}

.seg-btn.is-on {
  color: #2b2119;
  font-weight: 600;
}

.seg-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: #fffdf8;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(74, 52, 36, 0.14);
  transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}

.seg-thumb.is-right {
  transform: translateX(100%);
}

/* 错误横幅 */
.alert {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 0 0 14px;
  padding: 10px 12px;
  background: #fcefe9;
  border: 1px solid #f0cfc1;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #9c3826;
}

.alert-icon {
  font-size: 15px;
  margin-top: 1px;
  flex: none;
}

/* 表单字段 */
:deep(.fx-field) {
  display: block;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: #fffcf6;
  border: 1px solid #e8dcc9;
  border-radius: 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

:deep(.fx-field::after) {
  display: none;
}

:deep(.fx-field:focus-within) {
  background: #fffdfa;
  border-color: #b4442e;
  box-shadow: 0 0 0 3px rgba(180, 68, 46, 0.1);
}

:deep(.fx-field .van-field__label) {
  width: 100%;
  margin: 0 0 2px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: #9a8a78;
}

:deep(.fx-field .van-field__control) {
  font-size: 16px;
  color: #2b2119;
  caret-color: #b4442e;
}

:deep(.fx-field .van-field__control::placeholder) {
  font-size: 15px;
  color: #c4b6a4;
}

:deep(.fx-field .van-field__error-message) {
  margin-top: 4px;
  font-size: 12px;
  color: #b4442e;
}

:deep(.fx-field .van-field__right-icon) {
  display: flex;
  align-items: center;
  padding: 0;
}

.eye {
  display: flex;
  align-items: center;
  margin-left: 6px;
  padding: 4px;
  border: 0;
  background: transparent;
  color: #a8977f;
  cursor: pointer;
  transition: color 0.18s ease;
}

.eye:hover {
  color: #b4442e;
}

/* 主按钮 */
.submit {
  height: 48px;
  margin-top: 4px;
  border: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.08em;
  background: linear-gradient(135deg, #c25b3e 0%, #9c3826 100%);
  box-shadow: 0 12px 24px -14px rgba(156, 56, 38, 0.95);
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease;
}

.submit:active {
  transform: translateY(1px) scale(0.995);
}

.inline-tip {
  margin: 12px 0 0;
  text-align: center;
}

.link {
  padding: 4px;
  border: 0;
  background: none;
  font-family: inherit;
  font-size: 12px;
  color: #a8977f;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.link:hover {
  color: #9c3826;
}

/* 页脚 */
.card-foot {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed #e7dac8;
  text-align: center;
}

.foot-primary {
  margin: 0;
  font-size: 13px;
  color: #7e6c58;
}

.foot-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #a8977f;
}

.foot-privacy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 14px 0 0;
  font-size: 11px;
  color: #b3a28d;
}

@media (min-width: 768px) {
  .login-card {
    padding: 38px 30px 26px;
  }
}

@media (max-height: 620px) {
  .login-page {
    align-items: flex-start;
  }
}
</style>
