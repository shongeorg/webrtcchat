<script setup>
import {onBeforeUnmount, onMounted, ref, watch} from 'vue'

const props = defineProps({
  stream: {type: Object, required: true},
  muted: {type: Boolean, default: false}
})

const video = ref(null)

function attach() {
  if (video.value && video.value.srcObject !== props.stream) {
    video.value.srcObject = props.stream
  }
}

watch(() => props.stream, attach)
onMounted(attach)
onBeforeUnmount(() => {
  if (video.value) {
    video.value.srcObject = null
  }
})
</script>

<template>
  <video ref="video" autoplay playsinline :muted="muted"></video>
</template>
