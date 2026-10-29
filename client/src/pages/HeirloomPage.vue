<template>
  <div class="heirloom-page">
    <van-nav-bar title="传家宝" left-arrow @click-left="$router.back()" />

    <div class="heirloom-container">
      <div class="placeholder">
        <van-icon name="notes-o" size="64" color="#ddd" />
        <p>传家宝</p>
        <p class="desc">保存家传菜谱、祖传手艺、家训格言</p>
        <van-button type="primary" plain>
          添加传家宝
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.heirloom-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.heirloom-container {
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