<template>
  <div class="fv-empty" :class="{ 'is-compact': compact }">
    <div class="fv-empty-badge">
      <van-icon :name="icon" :size="compact ? 26 : 34" color="var(--fv-brass)" />
    </div>
    <p class="fv-empty-title">{{ title }}</p>
    <p v-if="desc" class="fv-empty-desc">{{ desc }}</p>
    <van-button
      v-if="actionText"
      class="fv-empty-btn"
      type="primary"
      round
      size="small"
      @click="$emit('action')"
    >
      {{ actionText }}
    </van-button>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'notes-o' },
  title: { type: String, default: '这里还没有内容' },
  desc: { type: String, default: '' },
  actionText: { type: String, default: '' },
  compact: { type: Boolean, default: false }
})
defineEmits(['action'])
</script>

<style scoped>
.fv-empty {
  text-align: center;
  padding: 56px 32px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fv-empty.is-compact {
  padding: 32px 24px 28px;
}

.fv-empty-badge {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  background: var(--fv-paper-glow, radial-gradient(circle at 50% 40%, #fbf3e6, #f3e9d8));
  border: 1px solid var(--fv-border-cream);
}

.fv-empty.is-compact .fv-empty-badge {
  width: 54px;
  height: 54px;
  margin-bottom: 14px;
}

.fv-empty-title {
  font-family: var(--fv-font-serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--fv-ink-2);
  margin: 0 0 8px;
  letter-spacing: 0.4px;
}

.fv-empty.is-compact .fv-empty-title {
  font-size: 15px;
}

.fv-empty-desc {
  font-size: 13px;
  line-height: 1.75;
  color: var(--fv-ink-3);
  margin: 0 0 20px;
  max-width: 280px;
}

.fv-empty-btn {
  height: 38px;
  padding: 0 26px;
  font-size: 14px;
}
</style>
