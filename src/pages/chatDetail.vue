<template>
  <q-layout>
    <q-header>
      <q-toolbar  v-if="!anySelected" >
        <q-btn flat dense icon="arrow_back_ios" @click="$router.go(-1)" />

        <div class="row items-center justify-between full-width">
          <div class="row items-center ">
            <div class="q-mr-sm">
              <q-avatar color="white" text-color="primary">
                {{  $store.getters['chat/currentUser'] &&  $store.getters['chat/currentUser'].name ? $store.getters['chat/currentUser'].name.substring(0,1).toUpperCase() : '' }}
              </q-avatar>
            </div>
            <div>
              <div class="text-weight-medium">
                {{ $store.getters['chat/currentUser'].name }}
              </div>
              <div style="font-size:11px; margin-top: -3px;" v-if="$store.state.chat.onlineUser &&  $store.state.chat.onlineUser.status">
                {{ $store.state.chat.custom && $store.state.chat.custom.text == 'typing' ? 'typing ...' : 'Online' }}
              </div>
              <div style="font-size:11px; margin-top: -3px;" v-if="$store.state.chat.onlineUser &&  !$store.state.chat.onlineUser.status">
                last seen {{ $store.state.chat.onlineUser.lastOnline  | moment("from", "now") }}
              </div>
            </div>
          </div>
          <div>
            <q-btn flat dense icon="more_vert" v-if="anySelected" />
            <q-btn flat dense icon="more_vert" @click="$router.go(-1)" />
          </div>
        </div>

      </q-toolbar>
      <q-toolbar  v-if="anySelected" >
        <q-btn flat dense icon="arrow_back_ios" @click="clearSelected()" />

        <div class="row items-center justify-between full-width">
          <div class="row items-center ">
            {{countSelected}}
          </div>
          <div>
            <q-btn flat dense icon="delete" v-if="anySelected" @click="deleteChat()"/>
          </div>
        </div>

      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page  class="flex" id="scroll-target-id" style="overflow: scroll">
        <q-scroll-area
          ref="scrollArea"
          scroll-target="#scroll-target-id"
          class="full-width"
          @scroll="onScrollSecond"
        >
          <!-- <q-chat-message
            class="q-pl-md q-pr-md"
            v-for="message in $store.getters['chat/messages']"
            :key="message.rowid"
            :name="message.fromid == $store.state.chat.user._id ? 'me' : message.fromContact.name"
            :text="[message.message]"
            stamp="7 minutes ago"
            :sent="message.fromid != $store.state.chat.user._id"
            :bg-color="message.fromid != $store.state.chat.user._id ? 'amber-7' : 'light-green'"
          /> -->
          <div
            class="row q-mb-xs q-gutter-y-xs"
            v-for="message in $store.getters['chat/messages']"
            :key="message.rowid"
          >
            <!-- me -->
            <div
              class="row justify-end full-width q-py-xs relative-position"
              v-if="message.fromid == $store.state.chat.user._id"
            >
              <div class="bg-blue-4 absolute-full" style="opacity: 0.3" v-if="message.selected" v-on:click="handleHold2(message)"></div>
              <div
                class="bg-green-2 q-pa-xs flex q-mr-xs"
                style="max-width:80%; min-width:150px; border-radius:6px; overflow: hidden;"
                v-touch-hold="handleHold(message)"
                v-on:click="handleHold2(message)"
              >
                <img :src="message.localFile" style="max-height: 300px;max-width: 100%" v-if="message.mediaType == 1" v-on:click="openFile(message.localFile)">
                <q-btn unelevated color="green-4" class="q-pa-xs " style="width: 250px;border-radius:6px" v-if="message.mediaType == 2 || message.mediaType == 3" @click="openFile(JSON.parse(message.mediaId).file)">
                  {{ JSON.parse(message.mediaId).name }}
                </q-btn>
                <!-- prettier-ignore -->
                <div class="chatBubble" v-if="message.status != 4 && message.status != 5">{{ message.message }}<span class="text-blue-2" style="margin-left:30px;">|</span></div>
                <div class="chatBubble deleted" v-if="message.status == 4 || message.status == 5">This Message Was Deleted<span class="text-blue-2" style="margin-left:30px;">|</span></div>

                <div
                  class="row self-end q-pt-xs"
                  style="font-size: 10px;margin-left: auto"
                >
                  <div class="row justify-center">
                    <div class="row items-center">
                      <div class="q-mr-xs">{{ message.createdAt  | moment("from", "now") }}</div>
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
              </div>
            </div>

            <!-- him -->
            <div
              class="row justify-between full-width q-py-xs relative-position"
              v-if="message.fromid != $store.state.chat.user._id"
            >
              <div class="bg-blue-4 absolute-full" style="opacity: 0.3" v-if="message.selected" v-on:click="handleHold2(message)"></div>
              <div
                class="bg-grey-3 q-pa-xs flex justify-between  q-ml-xs"
                style="max-width:80%; min-width:30px; border-radius:6px;"
                v-touch-hold="handleHold(message)"
                v-on:click="handleHold2(message)"
              >
                <!-- image me chat -->
                <div v-if="message.mediaType == 1">
                  <q-img :src="message.thumb" style="width: 200px; border-radius:3px;" v-if="!message.localFile">
                    <q-btn
                      :loading="message.downloading === true"
                      :percentage="message.percentage"
                      @click="download(message._id)"
                      outline
                      class="absolute-center"
                      round
                      color="white"
                      icon="get_app"
                    />
                  </q-img>
                  <q-img :src="message.localFile" style="width: 200px; border-radius:3px;" v-if="message.localFile" @click="openFile(message.localFile)"></q-img>
                </div>

                <div v-if="message.mediaType == 2 || message.mediaType == 3">
                  <q-btn unelevated :loading="message.downloading === true" :percentage="message.percentage" color="grey-7" icon="get_app" class="q-pa-xs " style="width: 250px;border-radius:6px" v-if="!message.localFile" @click="download(message._id)">
                    {{ JSON.parse(message.thumb).name }}
                  </q-btn>
                  <q-btn unelevated color="grey-7" class="q-pa-xs " style="width: 250px;border-radius:6px" v-if="message.localFile" @click="openFile(message.localFile)">
                    {{ JSON.parse(message.thumb).name }}
                  </q-btn>
                </div>

                <!-- prettier-ignore -->
                <div class="chatBubble" v-if="message.status != 4 && message.status != 5">{{ message.message }}<span class="text-blue-2" style="margin-left:30px;">|</span></div>
                <div class="chatBubble deleted" v-if="message.status == 4 || message.status == 5">This Message Was Deleted<span class="text-blue-2" style="margin-left:30px;">|</span></div>

                <div
                  class="row justify-end q-pt-xs"
                  style="font-size: 10px;margin-left: auto"
                >
                  <div>{{ message.createdAt  | moment("from", "now") }}</div>
                </div>
              </div>
            </div>
          </div>
          <div ref="last" style="height: 1px;"></div>
        </q-scroll-area>
      </q-page>
    </q-page-container>

    <q-footer class="row no-wrap q-py-xs justify-space q-px-xs">
      <div class="row content-end q-pb-xs">
        <q-btn flat dense icon="add" @click="showBottomSheet(true)" />
      </div>
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
          @input="
            postCustoms('typing');
            message.length > 0 ? (showSendBut = false) : (showSendBut = true);
          "
          @blur="
            postCustoms('untyping');
            showSendBut = true;
          "
          @keydown.shift.enter="shiftPlusEnter($event)"
          @keydown.enter="Enter($event)"
        />
      </div>
      <div class="row content-end q-pa-xs" v-if="showSendBut">
        <q-btn flat dense icon="camera_alt" @click="openCamera"/>
        <q-btn flat dense icon="mic" @click="recordAudio"/>
      </div>
      <div
        class="row content-end justify-center content-center"
        style="position: relative; width: 50px;"
        v-if="!showSendBut"
      >
        <q-icon name="play_circle_filled" style="font-size: 38px;" />
        <div class="transparentSend" @mousedown.prevent.stop="postMsg()"></div>
      </div>
    </q-footer>
  </q-layout>
</template>

<script>
// import { scroll } from 'quasar'
// const { getScrollTarget, setScrollPosition } = scroll
var _ = require('lodash')
import { mapState } from 'vuex'
import { Dialog } from 'quasar'
// import { scroll } from 'quasar'
// const { getScrollHeight } = scroll
export default {
  // name: 'PageName',
  computed: {
    ...mapState('chat', ['messages']),
    anySelected: {
      get () {
        return _.findIndex(this.$store.getters['chat/messages'], (m) => {
          return m.selected === true
        }) > -1
      }
    },
    countSelected: {
      get () {
        return _.filter(this.$store.getters['chat/messages'], { selected: true }).length
      }
    }
  },
  watch: {
    // messages (newValue, oldValue) {
    //   console.log(`Updating from ${oldValue.length} to ${newValue.length}`)

    //   // Do whatever makes sense now
    //   if (oldValue.length !== newValue.length) {
    //     alert('new')
    //   }
    // }
  },
  data () {
    return {
      message: '',
      showSendBut: true,
      unwatch: null,
      typing: false,
      imgTest: 'img',
      fistDone: false,
      fetching: false,
      loadNotDone: true,
      eachLoad: 5
    }
  },
  beforeRouteLeave (to, from, next) {
    // this.unwatch()
    this.$store.dispatch('chat/removeCurrent')
    next()
  },
  mounted () {
    console.log('scroll area', this.$refs.scrollArea.scrollPosition)
    this.$store.dispatch('chat/setCurrent', this.$router.currentRoute.params.id)

    this.$store.dispatch('chat/sendPendingChat').then(() => {
    })

    this.firstLoad()
    console.log(this.$socket)
  },
  methods: {
    async deleteChat () {
      console.log('delete chat')
      Dialog.create({
        title: 'Delete Message ?',
        options: {
          type: 'radio',
          model: 'opt1',
          // inline: true
          items: [
            { label: 'Delete For Me', value: 'opt1', color: 'secondary' },
            { label: 'Delete For Everyone', value: 'opt2' }
          ]
        },
        cancel: true,
        persistent: true
      }).onOk(data => {
        console.log('>>>> OK, received', data)
        let mode = true
        if (data === 'opt1') {
          mode = true
        } else {
          mode = false
          // alert('not yet')
          // return
        }
        this.$store.dispatch('chat/deleteSelected', mode).then(() => {
          this.clearSelected()
        })
      })
    },
    handleHold (index) {
      const _t = this
      return function (props) {
        console.log(index, props)
        console.log(_t)
        _t.$store.dispatch('chat/switchSelected', index._id)
      }
    },
    handleHold2 (index) {
      console.log('click')
      const a = _.find(this.$store.getters['chat/messages'], (m) => {
        return m.selected === true
      })
      if (a) {
        console.log('siwtch')
        this.$store.dispatch('chat/switchSelected', index._id)
      }
    },
    clearSelected () {
      this.$store.commit('chat/clearSelected')
    },
    onScrollSecond () {
      if (this.$refs.scrollArea.scrollPosition === 0 && this.fistDone && this.loadNotDone && !this.fetching) {
        const heightBefore = this.$refs.scrollArea.scrollPosition
        this.fetching = true
        this.$store.dispatch('chat/loadMessage', this.eachLoad).then(() => {
          this.$nextTick(() => {
            const heightAfter = this.$refs.scrollArea.scrollPosition
            // scrollPosition = getScrollPosition(this.scrollContainer),
            const heightDifference = heightAfter - heightBefore
            console.log('jancok', heightDifference)
            this.$refs.scrollArea.setScrollPosition(300)
            this.fetching = false
          })
        })
      }
    },
    firstLoad () {
      this.$store.dispatch('chat/loadMessage', 1).then(() => {
        this.$nextTick(() => {
          setTimeout(() => {
            if (this.$refs.scrollArea.scrollSize < this.$refs.scrollArea.containerHeight) {
              this.firstLoad()
            } else {
              this.fistDone = true
              this.animateScroll(300)
            }
          }, 10)
        })
      })
    },
    showBottomSheet (grid) {
      this.$q
        .bottomSheet({
          grid,
          dark: false,
          actions: [
            {
              label: 'Gallery',
              icon: 'photo',
              id: 'photo',
              color: 'red'
            },
            {
              label: 'Camera',
              icon: 'camera',
              id: 'camera',
              color: 'blue'
            },
            {
              label: 'Documents',
              icon: 'description',
              id: 'documents',
              color: 'green'
            },
            {
              label: 'Contact',
              icon: 'account_circle',
              id: 'account_circle',
              color: 'orange'
            }
          ]
        })
        .onOk(action => {
          console.log('actiuon', action)
          switch (action.id) {
            case 'photo':
              this.selectImage(window.Camera.PictureSourceType.PHOTOLIBRARY)
              break
            case 'camera':
              console.log('camera')
              this.selectImage(window.Camera.PictureSourceType.CAMERA)
              break
            case 'documents':
              console.log('documents')
              this.selectDocument()
              break
            default:
              break
          }
        })
    },
    openCamera () {
      this.selectImage(window.Camera.PictureSourceType.CAMERA)
    },
    async recordAudio () {
      try {
        const audioFile = await new Promise((resolve, reject) => {
          navigator.device.audiorecorder.recordAudio((file) => {
            resolve(JSON.parse(file))
          }, (e) => {
            reject(e)
          })
        })
        console.log('audioFile', audioFile)

        const dir = await new Promise((resolve, reject) => {
          window.resolveLocalFileSystemURL(cordova.file.externalApplicationStorageDirectory, (dirEntry) => {
            console.log(dirEntry)
            dirEntry.filesystem.root.getDirectory('MGGCHAT', {
              create: true,
              exclusive: false
            }, (dir) => {
              resolve(dir)
            }, (e) => {
              reject(e)
            })
          }, function (e) {
            reject(e)
          })
        })
        console.log('dir', dir)
        const fileCordova = await new Promise((resolve, reject) => {
          window.resolveLocalFileSystemURL('file://' + audioFile.full_path, (fileEntry) => {
            console.log('file entry', fileEntry)
            fileEntry.moveTo(dir, audioFile.file_name, (mt) => {
              mt.file((file) => {
                resolve({
                  file: file,
                  fileEntry: mt
                })
              }, function (e) {
                reject(e)
              })
            }, (e) => {
              console.log('fail to copy')
              reject(e)
            })
          }, function (e) {
            console.log('file tidak ditemukan ?')
            reject(e)
          })
        })

        console.log('fileCordova', fileCordova)
        await this.$store.dispatch('chat/saveChat', {
          text: this.message,
          mediaType: 3,
          mediaId: JSON.stringify({
            file: fileCordova.fileEntry.nativeURL,
            type: fileCordova.file.type,
            name: fileCordova.file.name
          }),
          localFile: fileCordova.nativeURL
        })

        this.animateScroll(100)

        this.$store.dispatch('chat/sendPendingChat')
      } catch (error) {
        console.log(error)
      }
      // other params durationLimit, viewColor, backgroundColor
    },
    async selectImage (source) {
      try {
        const img = await new Promise((resolve, reject) => {
          navigator.camera.getPicture((imageURI) => {
            console.log('%c-imageURI', 'color: yellow;', imageURI)
            resolve(imageURI)
          }, (error) => {
            reject(error)
          }, {
            quality: 50,
            sourceType: source,
            destinationType: window.Camera.DestinationType.FILE_URI,
            encodingType: window.Camera.EncodingType.JPEG
          })
        })
        const fileCompress = await new Promise((resolve, reject) => {
          let options = {}
          options = {
            uri: img,
            folderName: 'compress',
            quality: 90,
            width: 600,
            height: 600,
            base64: false,
            fit: false
          }
          window.ImageResizer.resize(options,
            function (image) {
              console.log('file compress: ', image)
              resolve(image)
            }, function (e) {
              console.log('error compress', e)
              reject(e)
            })
        })
        const dir = await new Promise((resolve, reject) => {
          window.resolveLocalFileSystemURL(cordova.file.externalApplicationStorageDirectory, (dirEntry) => {
            console.log(dirEntry)
            dirEntry.filesystem.root.getDirectory('MGGCHAT', {
              create: true,
              exclusive: false
            }, (dir) => {
              resolve(dir)
            }, (e) => {
              reject(e)
            })
          }, function (e) {
            reject(e)
          })
        })
        const imgCordova = await new Promise((resolve, reject) => {
          window.resolveLocalFileSystemURL(fileCompress, (fileEntry) => {
            console.log('file entry', fileEntry)
            fileEntry.moveTo(dir, fileEntry.name, (mt) => {
              mt.file((file) => {
                resolve({
                  file: file,
                  fileEntry: mt
                })
              }, function (e) {
                reject(e)
              })
            }, (e) => {
              reject(e)
            })
          }, function (e) {
            reject(e)
          })
        })
        console.log('image', imgCordova)
        // console.log('thumb', thumb)
        await this.$store.dispatch('chat/saveChat', {
          text: this.message,
          mediaType: 1,
          mediaId: JSON.stringify({
            file: imgCordova.fileEntry.nativeURL,
            type: imgCordova.file.type
          }),
          localFile: imgCordova.file.localURL
        })

        this.animateScroll(100)

        this.$store.dispatch('chat/sendPendingChat')
      } catch (error) {
        console.log(error)
      }
    },
    async selectDocument () {
      try {
        const file = await window.chooser.getFile()
        const dir = await new Promise((resolve, reject) => {
          window.resolveLocalFileSystemURL(cordova.file.externalApplicationStorageDirectory, (dirEntry) => {
            console.log(dirEntry)
            dirEntry.filesystem.root.getDirectory('MGGCHAT', {
              create: true,
              exclusive: false
            }, (dir) => {
              resolve(dir)
            }, (e) => {
              reject(e)
            })
          }, function (e) {
            reject(e)
          })
        })
        console.log('dir', dir)
        const fileCordova = await new Promise((resolve, reject) => {
          window.resolveLocalFileSystemURL(file.uri, (fileEntry) => {
            console.log('file entry', fileEntry)
            fileEntry.copyTo(dir, file.name, (file) => {
              resolve(file)
            }, (e) => {
              console.log('fail to copy')
              reject(e)
            })
          }, function (e) {
            reject(e)
          })
        })
        console.log('fileCordova', fileCordova)
        await this.$store.dispatch('chat/saveChat', {
          text: this.message,
          mediaType: 2,
          mediaId: JSON.stringify({
            file: fileCordova.nativeURL,
            type: file.mediaType,
            name: file.name
          }),
          localFile: fileCordova.nativeURL
        })

        this.animateScroll(100)

        this.$store.dispatch('chat/sendPendingChat')
      } catch (error) {
        console.log(error)
      }
    },
    async openFile (file) {
      try {
        const fileCordova = await new Promise((resolve, reject) => {
          window.resolveLocalFileSystemURL(file, (fileEntry) => {
            console.log('file entry', fileEntry)
            fileEntry.file((file) => {
              resolve(file)
            }, function (e) {
              reject(e)
            })
          }, function (e) {
            reject(e)
          })
        })
        console.log(fileCordova)
        cordova.plugins.fileOpener2.showOpenWithDialog(
          fileCordova.localURL,
          fileCordova.type,
          {
            error: function (e) {
              console.log('error', e)
            },
            success: function () {
              console.log('file opened successfully')
            }
          }
        )
      } catch (error) {
        console.log('error', error)
      }
    },
    download (uid) {
      this.$store.dispatch('chat/downloadMedia', uid)
    },
    shiftPlusEnter (e) {
      if (this.$q.platform.is.desktop) {
        e.preventDefault()
        this.message += '\n'
        console.log(this.message)
      }
    },
    Enter (e) {
      console.log('this.$q.platform.is.desktop', this.$q.platform.is.desktop)
      if (this.$q.platform.is.desktop) {
        e.preventDefault()
        if (!e.shiftKey) {
          if (this.message) {
            this.postMsg()
          }
        }
      }
    },
    animateScroll (time = 300) {
      // console.log('jancok', this.$refs)
      // const offset = this.$refs.scrollArea.offsetTop
      // console.log('jancok', offset)

      // const target = getScrollTarget(this.$refs.scrollArea)
      // const duration = 500
      this.$refs.scrollArea.setScrollPosition(this.$refs.scrollArea.scrollSize, time)
      // setScrollPosition(target, offset, duration)
    },
    async postMsg () {
      // clear the textarea
      // console.log(this.$store)
      // save in store to be shown in message
      const a = await this.$store.dispatch('chat/saveChat', {
        text: this.message,
        mediaType: 0,
        mediaId: '',
        localFile: ''
      })
      console.log('kok insert', a)

      this.animateScroll(100)

      this.$store.dispatch('chat/sendPendingChat')

      this.message = ''

      this.postCustoms('untyping')

      this.showSendBut = false
    },
    async postCustoms (evt) {
      const obj = {
        to: [this.$router.currentRoute.params.id],
        from: {
          name: this.$store.state.chat.user.name,
          _id: this.$store.state.chat.user._id
        },
        group: false,
        text: evt,
        date: Date.now()
      }

      switch (evt) {
        case 'typing':
          if (!this.typing) {
            await this.$appFeathers
              .service('customs')
              .create(obj)

            this.typing = true
          }
          break
        default:
          // else
          await this.$appFeathers.service('customs').create(obj)

          this.typing = false
      }
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
