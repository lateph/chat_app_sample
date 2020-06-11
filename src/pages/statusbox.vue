<template>
  <div class="row self-end q-pt-xs" style="font-size: 10px;margin-left: auto">
    <div class="row justify-center">
      <div class="row items-center">
        <dynamic-from-now  class="q-mr-xs" :value="message.createdAt"></dynamic-from-now >
        <q-icon name="schedule" style="font-size: 14px;" color="grey-14" v-if="message.status == 0"/>
        <q-icon name="done" style="font-size: 18px;" v-if="message.status == 1"/>
        <q-icon name="done_all" style="font-size: 18px;" v-if="message.status == 2"/>
        <q-icon name="done_all" style="font-size: 18px;" v-if="message.status == 3" color="blue" />
        <!-- <q-icon
          name="done"
          style="font-size: 10px; margin-left:-5px;"
        /> -->
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
