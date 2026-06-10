<!--
 * @Author: zzx 452436275@qq.com
 * @Date: 2026-01-27 16:34:25
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2026-06-10 10:46:47
 * @FilePath: /mb-editor/src/App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div class="container">
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  setup() {
    return {}
  }
}
</script>

<style lang="scss" scoped>
.container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}
</style>
