<template>
  <div class="graph-page">
    <van-nav-bar title="家族图谱" left-arrow @click-left="$router.back()" />

    <div class="graph-container">
      <div class="placeholder">
        <van-icon name="cluster-o" size="64" color="#ddd" />
        <p>家族知识图谱</p>
        <p class="desc">通过 AI 采访自动提取人物关系，构建可视化家族网络</p>
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
.graph-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.graph-container {
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