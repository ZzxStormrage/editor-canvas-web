<template>
  <router-view />
</template>

<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { consumeRouteAccessToken } from '../../services/route-auth-token.js'

const route = useRoute()
const router = useRouter()

watch(
  () => [route.query.token, route.query.authorization, route.query.Authorization],
  () => {
    void consumeRouteAccessToken(route, router).catch((error) => {
      console.error('H5 route token initialization failed.', error)
    })
  },
  { immediate: true }
)
</script>
