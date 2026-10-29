<template>
  <div class="map-page">
    <van-nav-bar title="记忆地图" left-arrow @click-left="$router.back()" />

    <div class="map-container">
      <div class="placeholder">
        <van-icon name="map-o" size="64" color="#ddd" />
        <p>记忆地图</p>
        <p class="desc">在地图上标注家族故事发生地，可视化迁徙路线</p>
        <van-button type="primary" plain @click="$router.push('/interview')">
          去采访
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.map-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.map-container {
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