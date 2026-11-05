<template>
  <div class="login-page">
    <div class="paper-lines" aria-hidden="true"></div>

    <main class="login-card">
      <header class="brand">
        <!-- 品牌记号：玉璧·传家（红绳系璧） -->
        <svg class="seal" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <radialGradient id="jade-plate" cx="0.5" cy="0.42" r="0.72">
              <stop offset="0" stop-color="#BFD2C4" />
              <stop offset="1" stop-color="#82A08E" />
            </radialGradient>
          </defs>
          <!-- 玉环：外圆 + 内孔 -->
          <circle cx="50" cy="50" r="33" fill="url(#jade-plate)" stroke="#608270" stroke-width="2.5" />
          <circle cx="50" cy="50" r="13" fill="#fffdf8" stroke="#608270" stroke-width="2" />
          <!-- 乳钉纹 -->
          <g fill="#D8E6DC">
            <circle cx="69.9" cy="61.5" r="3.2" />
            <circle cx="50" cy="73" r="3.2" />
            <circle cx="30.1" cy="61.5" r="3.2" />
            <circle cx="30.1" cy="38.5" r="3.2" />
            <circle cx="50" cy="27" r="3.2" />
            <circle cx="69.9" cy="38.5" r="3.2" />
          </g>
          <!-- 红绳：穿孔 + 结 + 双股穗 -->
          <line x1="50" y1="6" x2="50" y2="65" stroke="#B4442E" stroke-width="4.5" stroke-linecap="round" />
          <circle cx="50" cy="69" r="5" fill="#9E3626" />
          <circle cx="50" cy="67.5" r="2" fill="#B4442E" />
          <line x1="50" y1="73" x2="45.5" y2="88" stroke="#B4442E" stroke-width="2.5" stroke-linecap="round" />
          <line x1="50" y1="73" x2="54.5" y2="88" stroke="#B4442E" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="45.5" cy="88.5" r="1.8" fill="#9E3626" />
          <circle cx="54.5" cy="88.5" r="1.8" fill="#9E3626" />
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

      <!-- 云服务：WorkBuddy 账号登录 -->
      <div class="cloud-entry">
        <div class="cloud-divider"><span>云服务</span></div>
        <template v-if="cloudUser">
          <p class="cloud-signed">
            <van-icon name="success" />
            <span>已连接 {{ cloudUser.name || cloudUser.email || 'WorkBuddy 账号' }}</span>
          </p>
          <button class="cloud-btn is-ghost" type="button" @click="onCloudSignOut">断开云账号</button>
        </template>
        <template v-else>
          <button class="cloud-btn" type="button" :disabled="cloudLoading" @click="onCloudLogin">
            <span class="cloud-btn-icon" aria-hidden="true">W</span>
            <span>{{ cloudLoading ? '正在跳转…' : '使用 WorkBuddy 登录' }}</span>
          </button>
          <p class="cloud-hint">登录后可启用 AI 采访、照片云存储与家族数据云备份</p>
        </template>
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
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { authAPI } from '@/utils/api'
import { startWorkBuddyLogin, getCloudSession, signOutCloud } from '@/services/cloud'

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

/* ---- 云服务：WorkBuddy 账号登录 ---- */
const cloudUser = ref(null)
const cloudLoading = ref(false)

onMounted(async () => {
  try {
    const session = await getCloudSession()
    cloudUser.value = session?.user || null
  } catch { /* 未连接云账号 */ }
})

const onCloudLogin = async () => {
  if (cloudLoading.value) return
  cloudLoading.value = true
  try {
    const { url, error } = await startWorkBuddyLogin()
    if (error) {
      showToast(error)
      return
    }
    // 必须同标签页跳转，window.open 会丢失本地 PKCE 凭据
    location.assign(url)
  } catch (err) {
    showToast(err?.message || '无法发起云登录')
  } finally {
    cloudLoading.value = false
  }
}

const onCloudSignOut = async () => {
  try {
    await signOutCloud()
    cloudUser.value = null
    showToast('已断开云账号')
  } catch {
    showToast('断开失败，请重试')
  }
}
</script>

<style scoped>
.login-page {
  /* 登录页局部设计令牌（仅本页使用，收敛细色阶，避免散落硬编码） */
  --lg-brand-en: #b9a089;
  --lg-paper-glow: #fffbf2;
  --lg-label: #9a8a78;
  --lg-muted: #a8977f;
  --lg-ink-soft: #7e6c58;
  --lg-ink-strong: #4a3a2a;
  --lg-placeholder: #c4b6a4;
  --lg-border-soft: #e8dcc9;
  --lg-border-strong: #cbb79b;
  --lg-divider: #e7dac8;
  --lg-surface-raise: #fffdfa;
  --lg-chip-bg: #f2e8d9;
  --lg-accent: #c25b3e;
  --lg-jade: #7fa08c;
  --lg-jade-deep: #5b7d69;
  --lg-sheet: linear-gradient(135deg, #fdf7ec 0%, #f4ead9 100%);

  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 18px calc(28px + env(safe-area-inset-bottom));
  background:
    radial-gradient(120% 70% at 50% -8%, var(--lg-paper-glow) 0%, rgba(255, 251, 242, 0) 62%),
    radial-gradient(80% 55% at 100% 102%, rgba(201, 154, 91, 0.18), rgba(201, 154, 91, 0) 62%),
    var(--fv-paper);
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
  background: var(--fv-surface);
  border: 1px solid var(--fv-border);
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
  filter: drop-shadow(0 8px 14px rgba(96, 130, 112, 0.4));
}

.brand-title {
  margin: 0;
  font-family: 'Songti SC', 'STSong', 'SimSun', serif;
  font-size: 25px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-indent: 0.22em;
  color: var(--fv-ink);
}

.brand-en {
  margin: 6px 0 0;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.34em;
  text-indent: 0.34em;
  color: var(--lg-brand-en);
}

.brand-slogan {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--fv-ink-3);
}

/* 分段控件 */
.seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  margin-bottom: 16px;
  background: var(--lg-chip-bg);
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
  color: var(--lg-label);
  cursor: pointer;
  transition: color 0.18s ease;
}

.seg-btn.is-on {
  color: var(--fv-ink);
  font-weight: 600;
}

.seg-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: var(--fv-surface);
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
  background: var(--fv-primary-soft);
  border: 1px solid var(--fv-border-warm);
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--fv-primary-deep);
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
  background: var(--fv-surface-soft);
  border: 1px solid var(--lg-border-soft);
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
  background: var(--lg-surface-raise);
  border-color: var(--fv-primary);
  box-shadow: 0 0 0 3px rgba(180, 68, 46, 0.1);
}

:deep(.fx-field .van-field__label) {
  width: 100%;
  margin: 0 0 2px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--lg-label);
}

:deep(.fx-field .van-field__control) {
  font-size: 16px;
  color: var(--fv-ink);
  caret-color: var(--fv-primary);
}

:deep(.fx-field .van-field__control::placeholder) {
  font-size: 15px;
  color: var(--lg-placeholder);
}

:deep(.fx-field .van-field__error-message) {
  margin-top: 4px;
  font-size: 12px;
  color: var(--fv-primary);
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
  color: var(--lg-muted);
  cursor: pointer;
  transition: color 0.18s ease;
}

.eye:hover {
  color: var(--fv-primary);
}

/* 主按钮 */
.submit {
  height: 48px;
  margin-top: 4px;
  border: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.08em;
  background: linear-gradient(135deg, var(--lg-accent) 0%, var(--fv-primary-deep) 100%);
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
  color: var(--lg-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.link:hover {
  color: var(--fv-primary-deep);
}

/* 云服务入口 */
.cloud-entry {
  margin-top: 18px;
}

.cloud-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: var(--fv-ink-4);
  font-size: 11px;
  letter-spacing: 0.18em;
}

.cloud-divider::before,
.cloud-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--lg-divider);
}

.cloud-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 46px;
  border: 1px solid var(--lg-border-strong);
  border-radius: 14px;
  background: var(--lg-sheet);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  color: var(--lg-ink-strong);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease;
}

.cloud-btn:active {
  transform: translateY(1px);
  box-shadow: inset 0 2px 6px rgba(74, 52, 36, 0.12);
}

.cloud-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.cloud-btn.is-ghost {
  background: transparent;
  color: var(--lg-muted);
  font-weight: 500;
}

.cloud-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: linear-gradient(140deg, var(--lg-jade) 0%, var(--lg-jade-deep) 100%);
  color: var(--fv-surface);
  font-size: 13px;
  font-weight: 700;
}

.cloud-hint {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
  color: var(--lg-muted);
}

.cloud-signed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--lg-jade-deep);
}

/* 页脚 */
.card-foot {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed var(--lg-divider);
  text-align: center;
}

.foot-primary {
  margin: 0;
  font-size: 13px;
  color: var(--lg-ink-soft);
}

.foot-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--lg-muted);
}

.foot-privacy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 14px 0 0;
  font-size: 11px;
  color: var(--fv-ink-4);
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
