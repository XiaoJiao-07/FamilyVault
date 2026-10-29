<template>
  <div class="capsule-page">
    <van-nav-bar title="时光胶囊" left-arrow @click-left="$router.back()" />

    <div class="capsule-container">
      <div class="placeholder">
        <van-icon name="clock-o" size="64" color="#ddd" />
        <p>时光胶囊</p>
        <p class="desc">给未来的人录一段话，设定日期解锁</p>
        <van-button type="primary" plain>
          创建胶囊
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.capsule-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.capsule-container {
  padding: 16px;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.placeholder p {
  margin: 12px 0;
  font-size: 16px;
  color: #666;
}

.placeholder .desc {
  font-size: 13px;
  color: #999;
  margin-bottom: 24px;
}
</style>