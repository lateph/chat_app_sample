<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense icon="arrow_back_ios" @click="$router.go(-1)" />

        <q-toolbar-title>
          {{ $store.getters['chat/currentUser'].name }}
        </q-toolbar-title>

      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page >
        <q-scroll-area ref="scrollArea" style="height: calc(100vh - 100px);" class="full-width">
          <q-chat-message
            class="q-pl-md q-pr-md"
            v-for="message in messages"
            :key="message._id"
            :name="message.from == $store.state.chat.user._id ? 'me' : message.fromContact.name"
            :text="[message.text]"
            stamp="7 minutes ago"
            :sent="message.from != $store.state.chat.user._id"
            :bg-color="message.from != $store.state.chat.user._id ? 'amber-7' : 'light-green'"
          />
        </q-scroll-area>
      </q-page>
    </q-page-container>

    <q-footer class="row no-wrap q-py-xs justify-space q-px-xs">
      <!-- <div class="row content-end q-pb-xs">
        <q-btn flat dense icon="add" @click="showBottomSheet(true)" />
      </div> -->
      <div style="flex-grow:1;">
        <q-input
          ref="inputField"
          rounded
          borderless
          autogrow
          autofocus
          dense
          type="textarea"
          v-model.trim="message"
          input-class="bg-white q-px-md"
          input-style="border-radius: 16px; max-height:100px; "
          placeholder="Type a message"
          @input="
            postCustoms('typing...');
            message.length > 0 ? (showSendBut = false) : (showSendBut = true);
          "
          @blur="
            postCustoms('online');
            showSendBut = true;
          "
          @keydown.shift.enter="shiftPlusEnter($event)"
          @keydown.enter="Enter($event)"
        />
      </div>
      <!-- <div class="row content-end q-pa-xs" v-if="showSendBut">
        <q-btn flat dense icon="camera_alt" />
        <q-btn flat dense icon="mic" />
      </div> -->
      <div class="row">
        <q-btn flat dense icon="play_circle_filled" @click="postMsg()" style="font-size: 1.26em"/>
      </div>
      <!-- <div
        class="row content-end justify-center content-center"
        style="position: relative; width: 50px;"
      >
        <q-icon name="play_circle_filled" style="font-size: 38px;" />
        <div class="transparentSend" v-on:click="postMsg()"></div>
      </div> -->
    </q-footer>
  </q-layout>
</template>

<script>
// import { scroll } from 'quasar'
// const { getScrollTarget, setScrollPosition } = scroll
import { mapState } from 'vuex'
export default {
  // name: 'PageName',
  sockets: {
    connect () {
      alert('connect')
      // Fired when the socket connects.
      // this.isConnected = true;
    },

    disconnect () {
      alert('disconek')
      // this.isConnected = false;
    }
    // Fired when the server sends something on the "messageChannel" channel.
    // 'messages created' (data) {
    //   alert('taek 1')
    // }
  },
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
      unwatch: null
    }
  },
  beforeRouteLeave (to, from, next) {
    this.unwatch()
    next()
  },
  mounted () {
    console.log(this.$router)
    this.$store.commit('chat/setCurrent', this.$router.currentRoute.params.id)
    this.$store.dispatch('chat/current', this.$router.currentRoute.params.id).then(() => {
      this.$nextTick(() => {
        setTimeout(() => {
          this.animateScroll(0)
        }, 100)
      })
      // this.animateScroll(0)
    })
    this.unwatch = this.$store.watch(
      (state, getters) => state.chat.messages,
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
    postMsg () {
      // clear the textarea
      // console.log(this.$store)
      // save in store to be shown in message
      this.$store.dispatch('chat/sendChat', {
        text: this.message
      })
      // this.animateScroll()

      this.message = null
      // this.animateScroll()

      // console.log(this.$refs)
    },
    postCustoms () {

    }
  }
}
</script>
