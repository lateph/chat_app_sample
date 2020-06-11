<template>
  <div class="bg-grey-1 q-ma-xs rounded-borders row full-width">
    <div class="bg-purple-10 q-mr-xs" style="width:5px; border-radius: 4px 0 0 4px">
    </div>
    <div class="relative-position col-auto" style="flex-grow: 1">
        <div v-bind:class="['text-purple-10']" class="text-weight-medium">{{message.name}}</div>
        <div class="text-black" v-if="message.mediaType == 0">{{message.message}}</div>
        <div class="text-black" v-if="message.mediaType == 1 || message.mediaType == 1 || message.mediaType == 3">
            {{ JSON.parse(message.thumb).name }}
        </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['message'],
  name: 'PageIndex'
}
</script>
