<template>
  <q-layout>
    <q-header>
      <q-toolbar>
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
            <q-btn flat dense icon="more_vert" @click="$router.go(-1)" />
          </div>
        </div>

      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page  class="flex q-pa-sm">
         <q-scroll-area
          ref="scrollArea"
          class="full-width q-px-sm"
          content-style="height: 100%;"
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
              class="row justify-end full-width q-py-xs"
              v-if="message.fromid == $store.state.chat.user._id"
            >
              <div
                class="bg-green-2 q-pa-xs row"
                style="max-width:70%; min-width:50px; border-radius:6px;"
              >
                <!-- prettier-ignore -->
                <div class="chatBubble">{{ message.message}}<span class="text-blue-2" style="margin-left:50px;">|</span></div>

                <div
                  class="row justify-end full-width"
                  style="font-size: 10px; margin-top:-15px"
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
              class="row justify-start full-width q-py-xs"
              v-if="message.fromid != $store.state.chat.user._id"
            >
              <div
                class="bg-grey-3 q-pa-xs row"
                style="max-width:70%; min-width:50px; border-radius:6px;"
              >
                <!-- prettier-ignore -->
                <div class="chatBubble">{{ message.message}}<span class="text-grey-3" style="margin-left:35px;">|</span></div>

                <div
                  class="row justify-end full-width"
                  style="font-size: 10px; margin-top:-15px"
                >
                  <div>7:00pm</div>
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
        <q-btn flat dense icon="camera_alt" @click="selectImage"/>
        <q-btn flat dense icon="mic" />
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
import { mapState } from 'vuex'
export default {
  // name: 'PageName',
  computed: mapState('chat', ['messages']),
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
      message: null,
      showSendBut: true,
      unwatch: null,
      typing: false
    }
  },
  beforeRouteLeave (to, from, next) {
    this.unwatch()
    this.$store.dispatch('chat/removeCurrent')
    next()
  },
  mounted () {
    console.log(this.$router)
    this.$store.dispatch('chat/setCurrent', this.$router.currentRoute.params.id).then(() => {
      this.$nextTick(() => {
        setTimeout(() => {
          this.animateScroll(10)
        }, 100)
      })
    })

    this.unwatch = this.$store.watch(
      (state, getters) => state.chat.dataMessage,
      (newValue, oldValue) => {
        console.log(`Updating from ${oldValue.length} to ${newValue.length}`)

        // Do whatever makes sense now
        if (oldValue.length !== newValue.length && oldValue.length !== 0 && newValue.length !== 0) {
          this.$nextTick(() => {
            this.animateScroll(300)
          })
        } else {
          this.$nextTick(() => {
            this.animateScroll(300)
          })
        }
      }
    )
    console.log(this.$socket)
  },
  methods: {
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
              id: 'description',
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
          this.selectImage()
        })
    },
    async selectImage () {
      try {
        await this.$store.dispatch('chat/doSendMedia', {
          type: 'image/jpg'
        })
      } catch (error) {
        console.log(error)
      }
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
      console.log('cok scroll' + this.$refs.scrollArea.scrollSize)
      this.$refs.scrollArea.setScrollPosition(this.$refs.scrollArea.scrollSize, time)
      // setScrollPosition(target, offset, duration)
    },
    async postMsg () {
      // clear the textarea
      // console.log(this.$store)
      // save in store to be shown in message
      await this.$store.dispatch('chat/saveChat', {
        text: this.message
      })

      this.$store.dispatch('chat/sendPendingChat')

      this.message = null
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
</style>
