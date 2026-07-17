<template>
  <router-view />
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { installH5AccessTokenBridge } from './services/auth-token.js'
import { consumeRouteAccessToken } from './services/route-auth-token.js'

const route = useRoute()
const router = useRouter()
const removeH5TokenSubscription = installH5AccessTokenBridge()

onBeforeUnmount(removeH5TokenSubscription)

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
