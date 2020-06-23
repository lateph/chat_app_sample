<template>
    <q-dialog v-model="modal" maximized>
      <q-layout class="bg-white">
        <q-header class="transparent">
          <q-toolbar>
            <q-btn flat @click="close()" round dense icon="arrow_back" />
            <q-toolbar-title>{{ user.name }}</q-toolbar-title>
          </q-toolbar>
        </q-header>

        <q-page-container style="padding: 0 !important">
          <q-page class="bg-black">
            <v-zoomer style="width: 100vw; height: 100vh;">
              <img
                :src="img"
                style="object-fit: contain; width: 100%; height: 100%;"
              >
            </v-zoomer>
          </q-page>
        </q-page-container>

        <q-footer class="">
          <div class="row no-wrap q-py-xs justify-space q-px-xs" >
            <div style="flex-grow:1;">
              <q-input
                ref="inputField"
                rounded
                borderless
                autogrow
                dense
                type="textarea"
                v-model.trim="message"
                input-class="bg-white q-px-md"
                input-style="border-radius: 16px; max-height:100px; "
                placeholder="Type a message"
                @keydown.shift.enter="shiftPlusEnter($event)"
                @keydown.enter="Enter($event)"
              />
            </div>
            <div
              class="row content-end justify-center content-center"
              style="position: relative; width: 50px;"
            >
              <q-icon name="play_circle_filled" style="font-size: 38px;" />
              <div class="transparentSend" @mousedown.prevent.stop="postMsg()"></div>
            </div>
          </div>
        </q-footer>
      </q-layout>
    </q-dialog>
</template>

<script>
// var _ = require('lodash')
import { mapState } from 'vuex'

export default {
  props: ['model'],
  name: 'PageIndex',
  data () {
    return {
      modal: false,
      selected: [],
      resolve: null,
      reject: null,
      exclude: '',
      group: true,
      user: {},
      img: '',
      message: ''
    }
  },
  computed: {
    ...mapState('chat', ['messages'])
  },
  methods: {
    async open (params) {
      this.selected = []
      this.modal = true
      this.message = ''
      // const imgCordova = await new Promise((resolve, reject) => {
      //   window.resolveLocalFileSystemURL(params.img, (fileEntry) => {
      //     console.log('file entry', fileEntry)
      //     fileEntry.file((file) => {
      //       resolve(file)
      //     }, function (e) {
      //       reject(e)
      //     })
      //   }, function (e) {
      //     reject(e)
      //   })
      // })
      // console.log(imgCordova)
      this.img = params.img
      return new Promise((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      })
    },
    postMsg () {
      console.log('jancok kirim blok goblok')
      this.modal = false
      this.resolve(this.message)
    },
    close () {
      this.modal = false
      this.reject()
    },
    save () {
      this.modal = false
      this.resolve(this.selected)
    }
  }
}
</script>

<style scoped>
.q-bottom-sheet--grid .q-icon,
.q-bottom-sheet--grid img,
.q-bottom-sheet--grid .q-bottom-sheet__empty-icon {
  margin-bottom: 0 !important;
}

.transparentSend {
  z-index: 10;
  display: block;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
}

.chatBubble {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
}

.deleted {
  font-style: italic;
  color: grey;
}
</style>
