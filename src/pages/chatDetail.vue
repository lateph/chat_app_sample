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
              <div class="text-weight-medium" v-if="$store.getters['chat/currentUser'].isBroadcast">
                {{ $store.getters['chat/currentUser'].members.length }} recipients
              </div>
              <div class="text-weight-medium" v-if="!$store.getters['chat/currentUser'].isBroadcast">
                {{ $store.getters['chat/currentUser'].name }}
              </div>
              <div style="font-size:11px; margin-top: -3px;" v-if="$store.state.chat.onlineUser &&  $store.state.chat.onlineUser.status">
                <div v-if="!$store.getters['chat/currentUser'].isGroup">
                  {{ $store.state.chat.custom && $store.state.chat.custom.text == 'typing' ? 'typing ...' : 'Online' }}
                </div>
              </div>
              <div v-if="$store.getters['chat/currentUser'].isGroup" @click="groupDetail = true">
                {{$store.getters['chat/currentUser'].joinStringMember}}
              </div>
              <div style="font-size:11px; margin-top: -3px;" v-if="$store.state.chat.onlineUser &&  !$store.state.chat.onlineUser.status">
                last seen {{ $store.state.chat.onlineUser.lastOnline  | moment("from", "now") }}
              </div>
            </div>
          </div>
          <div>
            <q-btn flat dense icon="more_vert" v-if="$store.getters['chat/currentUser'].isGroup">
              <q-menu>
                <q-list style="min-width: 100px">
                  <q-item clickable v-close-popup @click="logout()">
                    <q-item-section>Logout</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="syncMain()">
                    <q-item-section>Sync Contact</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
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
            <q-btn
              flat dense
              v-if="countSelected == 1"
              icon="reply"
              @click="reply()"
            />
            <q-btn flat dense icon="delete" v-if="anySelected" @click="deleteChat()"/>
            <q-btn
              style="transform: scaleX(-1)"
              flat dense
              icon="reply"
              @click="forward()"
            />
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
          <div class="row q-mb-xs q-gutter-y-xs" v-for="message in $store.getters['chat/messages']" :key="message.rowid" :id="'id-' + message._id">
            <!-- me -->
            <div class="row justify-end full-width q-py-xs relative-position" v-if="message.mediaType < 11 && message.fromid == $store.state.chat.user._id">
              <div class="bg-blue-4 absolute-full" style="opacity: 0.3" v-if="message.selected" v-on:click="handleHold2(message)"></div>
              <div class="bg-green-4 absolute-full" style="opacity: 0.3" v-if="message.hightlight" v-on:click="handleHold2(message)"></div>
              <!-- text Only -->
              <div v-if="(!message.mediaType || message.mediaType == '0') && message.status != 4 && message.status != 5" class="bg-green-2 q-pa-xs column q-mr-xs" style="max-width:80%; min-width:150px; border-radius:6px; overflow: hidden;" v-touch-hold="handleHold(message)" v-on:click="handleHold2(message)">
                <div v-if="message.params && message.params.isForward" style="font-style: italic;font-size: 12px" class="text-grey"><q-icon name="reply" color="grey" style="transform: scaleX(-1); margin-bottom: 3px"/>Forwarded</div>
                <replybox  v-if="message.params && message.params.replyMessage" :message="message.params.replyMessage" class="self-start" @click.native="scrollTo(message)"/>
                <div class="row">
                  <div class="chatBubble" v-if="message.status != 4 && message.status != 5">{{ message.message }}<span class="text-blue-2" style="margin-left:30px;">|</span></div>
                  <div class="chatBubble deleted" v-if="message.status == 4 || message.status == 5">This Message Was Deleted<span class="text-blue-2" style="margin-left:30px;">|</span></div>

                  <statusbox :message="message" :broadcast="true"/>
                </div>
              </div>
              <!-- Image = type = 1 -->
              <div v-if="message.mediaType == 1 && message.status != 4 && message.status != 5" class="bg-green-2 q-pa-xs flex q-mr-xs" style="max-width:80%; min-width:150px; border-radius:6px; overflow: hidden;" v-touch-hold="handleHold(message)" v-on:click="handleHold2(message)">
                <div v-if="message.params && message.params.isForward" style="font-style: italic;font-size: 12px" class="text-grey"><q-icon name="reply" color="grey" style="transform: scaleX(-1); margin-bottom: 3px"/>Forwarded</div>
                <img :src="message.localFile" style="max-height: 300px;max-width: 100%; min-width: 150px" v-if="message.mediaType == 1" v-on:click="openFile(message.localFile)">
                <q-btn unelevated color="green-4" class="q-pa-xs " style="width: 250px;border-radius:6px" v-if="message.mediaType == 2 || message.mediaType == 3" @click="openFile(JSON.parse(message.mediaId).file)">
                  {{ JSON.parse(message.mediaId).name }}
                </q-btn>
                <!-- prettier-ignore -->
                <!-- <div class="chatBubble" v-if="message.status != 4 && message.status != 5">{{ message.message }}<span class="text-blue-2" style="margin-left:30px;">|</span></div> -->
                <div class="chatBubble deleted" v-if="message.status == 4 || message.status == 5">This Message Was Deleted<span class="text-blue-2" style="margin-left:30px;">|</span></div>

                <statusbox :message="message" />
              </div>
              <!-- other file type type = 2 -->
              <div v-if="message.mediaType == 2 && message.status != 4 && message.status != 5" class="column bg-green-2 q-pa-xs flex q-mr-xs" style="max-width:80%; min-width:150px; border-radius:6px; overflow: hidden;" v-touch-hold="handleHold(message)" v-on:click="handleHold2(message)">
                <div v-if="message.params && message.params.isForward" style="font-style: italic;font-size: 12px" class="text-grey"><q-icon name="reply" color="grey" style="transform: scaleX(-1); margin-bottom: 3px"/>Forwarded</div>
                <q-btn unelevated color="green-4" class="q-pa-xs " style="width: 250px;border-radius:6px" v-if="message.mediaType == 2 || message.mediaType == 3" @click="openFile(JSON.parse(message.mediaId).file)">
                  {{ JSON.parse(message.mediaId).name }}
                </q-btn>
                <!-- prettier-ignore -->
                <!-- <div class="chatBubble" v-if="message.status != 4 && message.status != 5">{{ message.message }}<span class="text-blue-2" style="margin-left:30px;">|</span></div> -->
                <!-- <div class="chatBubble deleted" v-if="message.status == 4 || message.status == 5">This Message Was Deleted<span class="text-blue-2" style="margin-left:30px;">|</span></div> -->

                <statusbox :message="message" />
              </div>

              <div v-if="message.status == 4 || message.status == 5" class="column bg-green-2 q-pa-xs flex q-mr-xs" style="max-width:80%; min-width:150px; border-radius:6px; overflow: hidden;" v-touch-hold="handleHold(message)" v-on:click="handleHold2(message)">
                <div class="chatBubble deleted" >This Message Was Deleted<span class="text-blue-2" style="margin-left:30px;"></span></div>
                <div class="row self-end q-pt-xs" style="font-size: 10px;margin-left: auto">
                  <div class="row justify-center">
                    <div class="row items-center">
                      <dynamic-from-now  class="q-mr-xs" :value="message.createdAt"></dynamic-from-now>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- him -->
            <div  class="row justify-between full-width q-py-xs relative-position"  v-if="message.mediaType < 11 && message.fromid != $store.state.chat.user._id">
              <div class="bg-blue-4 absolute-full" style="opacity: 0.3" v-if="message.selected" v-on:click="handleHold2(message)"></div>
              <div class="bg-green-4 absolute-full" style="opacity: 0.3" v-if="message.hightlight" v-on:click="handleHold2(message)"></div>
              <!-- text Only -->
              <div class="bg-grey-3 q-pa-xs q-ml-xs" style="border-radius: 6px;max-width:80%; min-width:30px;">
                <div v-if="message.params && message.params.isForward" style="font-style: italic;font-size: 12px" class="text-grey"><q-icon name="reply" color="grey" style="transform: scaleX(-1); margin-bottom: 3px"/>Forwarded</div>
                <div class="text-weight-medium" v-bind:class="['text-'+message.color]" v-if="message.groupId">{{message.fromContact.name}}</div>
                <replybox  v-if="message.params && message.params.replyMessage" :message="message.params.replyMessage" class="self-start"  @click.native="scrollTo(message)"/>
                <div v-if="(!message.mediaType || message.mediaType == '0')  && message.status != 4 && message.status != 5" class="flex justify-between  " style="" v-touch-hold="handleHold(message)" v-on:click="handleHold2(message)">
                  <div class="chatBubble" >{{ message.message }}<span class="text-blue-2" style="margin-left:30px;"></span></div>
                  <div
                    class="row justify-end q-pt-xs"
                    style="font-size: 10px;margin-left: auto"
                  >
                    <div>{{ message.createdAt  | moment("from", "now") }}</div>
                  </div>
                </div>
                <!-- Image = type = 1 -->
                <div v-if="message.mediaType == 1 && message.status != 4 && message.status != 5" class="flex justify-between relative-position" style="" v-touch-hold="handleHold(message)" v-on:click="handleHold2(message)">
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

                  <!-- <div class="chatBubble">{{ message.message }}<span class="text-blue-2" style="margin-left:30px;">|</span></div> -->

                  <div
                    class="row justify-end q-pt-xs absolute" style="font-size: 10px;bottom: 10px;right:10px"
                  >
                    <div class="text-white">{{ message.createdAt  | moment("from", "now") }}</div>
                  </div>
                </div>
                <!-- other = type = 2 -->
                <div v-if="message.mediaType == 2 && message.status != 4 && message.status != 5" class="column flex justify-between" style="" v-touch-hold="handleHold(message)" v-on:click="handleHold2(message)">
                  <!-- image me chat -->
                  <div v-if="message.mediaType == 2 || message.mediaType == 3">
                    <q-btn unelevated :loading="message.downloading === true" :percentage="message.percentage" color="grey-7" icon="get_app" class="q-pa-xs " style="width: 250px;border-radius:6px;word-break: break-all;" v-if="!message.localFile" @click="download(message._id)">
                      {{ JSON.parse(message.thumb).name }}
                    </q-btn>
                    <q-btn unelevated color="grey-7" class="q-pa-xs " style="width: 250px;border-radius:6px;word-break: break-all;" v-if="message.localFile" @click="openFile(message.localFile)">
                      {{ JSON.parse(message.thumb).name }}
                    </q-btn>
                  </div>
                  <div
                    class="row justify-end q-pt-xs"
                    style="font-size: 10px;margin-left: auto"
                  >
                    <div>{{ message.createdAt  | moment("from", "now") }}</div>
                  </div>
                </div>
                <div v-if="message.status == 4 || message.status == 5" class="column flex justify-between" style="" v-touch-hold="handleHold(message)" v-on:click="handleHold2(message)">
                  <!-- prettier-ignore -->
                  <div class="chatBubble deleted">This Message Was Deleted<span class="text-blue-2" style="margin-left:30px;"></span></div>
                  <div
                    class="row justify-end q-pt-xs"
                    style="font-size: 10px;margin-left: auto"
                  >
                    <div>{{ message.createdAt  | moment("from", "now") }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="message.mediaType == 11" class="row justify-center full-width">
              <div  class="bg-light-blue-6 q-pa-xs text-white q-mt-xs" style="font-size: 11px; border-radius: 5px">
                <div v-if="message.message.code == 'create_group'">
                  {{message.message.userName}} created group {{message.message.groupName}}
                </div>
                <div v-if="message.message.code == 'remove_from_group'">
                  {{message.message.userName}} remove {{message.message.targetUserName}}
                </div>
                <div v-if="message.message.code == 'add_to_group'">
                  {{message.message.userName}} add {{message.message.targetUserName}}
                </div>
                <div v-if="message.message.code == 'left_from_group'">
                  {{message.message.userName}} left
                </div>
                <div v-if="message.message.code == 'add_admin_group'">
                  {{message.message.targetUserName}} now an admin
                </div>
                <div v-if="message.message.code == 'date'">
                  {{message.message.date}}
                </div>
              </div>
            </div>
            <div v-if="message.mediaType == 12" class="row justify-center full-width">
              <div  class="bg-light-blue-6 q-pa-xs text-white q-mt-xs" style="font-size: 11px; border-radius: 5px">
                {{message.date}}
              </div>
            </div>
          </div>
          <div ref="last" style="height: 1px;"></div>
        </q-scroll-area>
      </q-page>
    </q-page-container>

    <q-footer v-if="!disableChat">
      <div class="bg-grey-3 q-ma-xs rounded-borders row" v-if="replyMessage">
        <div class="bg-purple-10 q-mr-xs" style="width:5px; border-radius: 4px 0 0 4px">
        </div>
        <div class="relative-position col-auto" style="flex-grow: 1">
          <div v-bind:class="['text-purple-10']" class="text-weight-medium">{{replyMessage.fromContact.name}}</div>
          <div class="text-black">{{replyMessage.message}}</div>
          <q-icon name="close" color="grey-7" class="absolute-top-right" @click="closeReply()"/>
        </div>
      </div>
      <div class="row no-wrap q-py-xs justify-space q-px-xs" >
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
        <div class="row content-end q-pa-xs" v-if="message.length == 0">
          <q-btn flat dense icon="camera_alt" @click="openCamera"/>
          <q-btn flat dense icon="mic" @click="recordAudio"/>
        </div>
        <div
          class="row content-end justify-center content-center"
          style="position: relative; width: 50px;"
          v-if="message.length > 0"
        >
          <q-icon name="play_circle_filled" style="font-size: 38px;" />
          <div class="transparentSend" @mousedown.prevent.stop="postMsg()"></div>
        </div>
      </div>
    </q-footer>

    <q-footer class="row no-wrap q-pa-xs justify-space bg-grey text-center" v-if="disableChat">
      You can't send message to this group because you're no longer participant
    </q-footer>

    <q-dialog v-model="groupDetail" maximized>
      <q-layout class="bg-white">
        <q-header class="bg-primary">
          <q-toolbar>
            <q-btn flat @click="groupDetail = false" round dense icon="arrow_back" />
            <q-toolbar-title>{{ $store.getters['chat/currentUser'].name }}</q-toolbar-title>
            <q-btn flat round dense icon="person_add"  @click="groupDetail = false;groupAdd = true" v-if="isAdmin"/>
          </q-toolbar>
        </q-header>

        <q-page-container>
          <q-page class="bg-blue-grey-1">
            <q-card class="my-card  bg-blue-7 no-round no-border-radius" >
              <!-- <q-img
                src="~assets/group.svg"
                basic
                style="max-height: 60vw"
              >
              </q-img> -->
              <div style="background: url(./statics/group.png);height: 60vw;background-repeat: no-repeat;background-position: center;background-size: contain" class="q-pa-xs">
                <div class="absolute-bottom text-white" style="font-size: 12px; bottom: 10px; left: 10px">
                  Created By user-name, 16/09/2019
                </div>
              </div>
            </q-card>
            <q-list class="bg-white">
              <q-item-label header>{{2}} participans</q-item-label>
              <q-item v-for="contact in listMember" :key="contact._id" class="q-my-sm" clickable v-ripple @click="removeMember(contact)">
              <q-item-section avatar class="relative-position">
                  <q-avatar color="primary" text-color="white">
                    {{ contact.email.substring(0,1).toUpperCase() }}
                  </q-avatar>
                  <q-icon
                    size="24px"
                    color="green"
                    name="check_circle"
                    class="absolute-bottom-right"
                    v-if="contact.selected"
                  />
              </q-item-section>

              <q-item-section>
                  <q-item-label></q-item-label>
                  <q-item-label caption lines="1">{{ contact.name }}</q-item-label>
              </q-item-section>

              <q-item-section side v-if="contact.isAdmin">
                <q-btn outline rounded color="green" label="admin" size="xs" />
              </q-item-section>
              </q-item>
            </q-list>
            <q-list class="bg-white" v-if="!disableChat">
              <q-item class="q-my-sm" clickable v-ripple @click="leftGroup">
                <q-item-section avatar class="relative-position">
                  <q-icon
                    color="red"
                    name="exit_to_app"
                  />
                </q-item-section>

                <q-item-section>
                    <q-item-label>Exit Group</q-item-label>
                </q-item-section>

                <q-item-section side>
                    <!-- admin -->
                </q-item-section>
              </q-item>
            </q-list>
          </q-page>
        </q-page-container>
      </q-layout>
    </q-dialog>

    <q-dialog v-model="groupAdd" maximized>
      <q-layout  class="bg-white">
        <q-header elevated>
          <q-toolbar>
            <q-btn flat dense icon="arrow_back_ios" @click="groupAdd = false" />

            <div class="row items-center justify-between full-width">
              <div class="row items-center ">
                <div>
                  <div class="text-weight-medium">
                    {{ $store.getters['chat/currentUser'].name }}
                  </div>
                  <div style="font-size:11px; margin-top: -3px;">
                    {{selected.length}} of {{contacts.length}} Selected
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
          <q-page>
            <q-scroll-area
              v-if="selected.length > 0"
              horizontal
              style="height: 64px"
              class="bg-grey-1 rounded-borders"
            >
              <div class="row no-wrap">
                <div v-for="n in selected" :key="n._id" class="q-ma-sm relative-position">
                  <q-avatar color="primary" text-color="white">
                    {{ n.email.substring(0,1).toUpperCase() }}
                  </q-avatar>
                  <q-icon
                    size="24px"
                    color="grey"
                    name="remove_circle"
                    class="absolute-bottom-right"
                  />
                </div>
              </div>
            </q-scroll-area>
            <q-list bordered>
                <q-item v-for="contact in contactJoin" :key="contact._id" class="q-my-sm" clickable v-ripple @click="add(contact)">
                <q-item-section avatar class="relative-position">
                    <q-avatar color="primary" text-color="white">
                    {{ contact.email.substring(0,1).toUpperCase() }}
                    </q-avatar>
                    <q-icon
                      size="24px"
                      color="green"
                      name="check_circle"
                      class="absolute-bottom-right"
                      v-if="contact.selected"
                    />
                </q-item-section>

                <q-item-section>
                    <q-item-label></q-item-label>
                    <q-item-label caption lines="1">{{ contact.name }}</q-item-label>
                </q-item-section>

                <q-item-section side>
                    <!-- <q-icon name="chat_bubble" color="green" /> -->
                </q-item-section>
                </q-item>
            </q-list>
            <q-page-sticky position="bottom-right" :offset="[18, 18]">
              <q-btn fab icon="arrow_forward" color="accent"  @click="addToGroup()"/>
            </q-page-sticky>
          </q-page>
        </q-page-container>
      </q-layout>
    </q-dialog>

    <dialogSelectUser ref="userSelect"/>
  </q-layout>
</template>

<script>
// import { scroll } from 'quasar'
// const { getScrollTarget, setScrollPosition } = scroll
var _ = require('lodash')
import { mapState } from 'vuex'
import { Dialog, uid } from 'quasar'
var moment = require('moment')
import replybox from './replybox.vue'
import statusbox from './statusbox.vue'
import dialogSelectUser from './dialogSelectUser.vue'

// import { scroll } from 'quasar'
// const { getScrollHeight } = scroll
import Vue from 'vue'

var Clock = new Vue({
  created () {
    this.listeners = 0 // set non-reactive counter
  },
  methods: {
    start () {
      this.interval = setInterval(this.emit, 10000)
      console.log('start interval ', this.interval)
    },
    emit () {
      console.log('tick')
      this.$emit('tick')
    },
    register (cb) {
      console.log('register')
      if (!cb) return
      if (this.listeners === 0) {
        this.start()
      }
      this.listeners++
      this.$on('tick', cb)
    },
    unregister (cb) {
      if (!cb) return
      this.listeners--
      console.log('unregister', this.listeners)
      this.$off('tick', cb)
      if (this.listeners === 0) {
        console.log('clear interval', this.interval)
        clearInterval(this.interval)
      }
    }
  }
})

Vue.component('dynamic-from-now', {
  name: 'DynamicFromNow',
  props: {
    tag: { type: String, default: 'span' },
    value: { type: String, default: () => moment().toISOString() },
    dropFixes: {
      default: false,
      type: Boolean
    },
    interval: { type: Number, default: 10000 }
  },
  data () {
    // return { fromNow: this.value }
    return { fromNow: moment(this.value).format('HH:ss') }
    // return { fromNow: moment(this.value).fromNow(this.dropFixes) }
  },
  mounted () {
    Clock.register(this.updateFromNow)
    this.$watch('value', this.updateFromNow)
  },
  beforeDestroy () {
    Clock.unregister(this.updateFromNow)
  },
  methods: {
    updateFromNow () {
      // var newFromNow = moment(this.value).fromNow(this.dropFixes)
      // if (newFromNow !== this.fromNow) {
      //   this.fromNow = newFromNow
      // }
      // this.fromNow = moment(this.value).format('HH:ss')
    }
  },
  render (h) {
    return h(this.tag, { key: this.fromNow }, this.fromNow)
  }
})

export default {
  components: {
    replybox,
    statusbox,
    dialogSelectUser
  },
  // name: 'PageName',
  computed: {
    ...mapState('chat', ['messages']),
    contactJoin: {
      get () {
        return _.map(this.contacts, (e) => {
          const selected = _.findIndex(this.selected, (s) => {
            return s._id === e._id
          })
          return {
            ...e,
            selected: selected > -1
          }
        })
      }
    },
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
    },
    contacts: {
      get () {
        return _.filter(this.$store.state.chat.contacts, (e) => {
          return _.findIndex(this.$store.getters['chat/currentUser'].members, (x) => x._id === e._id) === -1
        })
      }
    },
    listMember: {
      get () {
        return _.map(this.$store.getters['chat/currentUser'].members, (e) => {
          const index = _.findIndex(this.$store.getters['chat/currentUser'].admins, (x) => x === e._id)
          return {
            ...e,
            isAdmin: index > -1
          }
        })
      }
    },
    isAdmin: {
      get () {
        console.log(this.$store.getters['chat/currentUser'].admins)
        return _.findIndex(this.$store.getters['chat/currentUser'].admins, (x) => x === this.$store.state.chat.user._id) > -1
      }
    },
    disableChat: {
      get () {
        if (!this.$store.getters['chat/currentUser'].isGroup) {
          return false
        } else {
          return false
          // return _.findIndex(this.$store.getters['chat/currentUser'].members, (x) => x._id === this.$store.state.chat.user._id) === -1
        }
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
      selected: [],
      groupDetail: false,
      groupAdd: false,
      message: '',
      showSendBut: true,
      unwatch: null,
      typing: false,
      imgTest: 'img',
      fistDone: false,
      fetching: false,
      loadNotDone: true,
      eachLoad: 5,
      replyMessage: null,
      disableScrollCheck: false
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
    async removeMember (contact) {
      if (contact.isAdmin) {
        return
      }
      if (!this.isAdmin) {
        return
      }
      this.$q.bottomSheet({
        message: 'Bottom Sheet message',
        actions: [
          {
            label: 'Make Group Admin',
            icon: 'person_add',
            color: 'green',
            id: 'addadmin'
          },
          {
            label: 'Remove ' + contact.name,
            icon: 'delete',
            color: 'red',
            id: 'delete'
          }
        ]
      }).onOk(async action => {
        // console.log('Action chosen:', action.id)
        if (action.id === 'delete') {
          await this.$store.dispatch('chat/removeMemberGroup', {
            _id: this.$store.getters['chat/currentUser'].convid,
            member: contact._id
          })
          await this.$store.dispatch('chat/saveChat', {
            text: JSON.stringify({
              code: 'remove_from_group',
              userId: this.$store.state.chat.user._id,
              userName: this.$store.state.chat.user.name,
              targetUserId: contact._id,
              targetUserName: contact.name
            }),
            mediaType: 11,
            mediaId: '',
            localFile: ''
          })
          this.$store.dispatch('chat/sendPendingChat')
          this.groupDetail = false
        }
        if (action.id === 'addadmin') {
          await this.$store.dispatch('chat/addAdminGroup', {
            _id: this.$store.getters['chat/currentUser'].convid,
            member: contact._id,
            contact: contact
          })
          this.groupDetail = false
        }
      }).onCancel(() => {
        // console.log('Dismissed')
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    },
    async addToGroup () {
      await this.$store.dispatch('chat/addGroupMember', {
        _id: this.$store.getters['chat/currentUser'].convid,
        members: _.map(this.selected, e => e._id)
      })

      for (let index = 0; index < this.selected.length; index++) {
        const element = this.selected[index]
        this.$store.dispatch('chat/saveChat', {
          text: JSON.stringify({
            code: 'add_to_group',
            userId: this.$store.state.chat.user._id,
            userName: this.$store.state.chat.user.name,
            targetUserId: element._id,
            targetUserName: element.name
          }),
          mediaType: 11,
          mediaId: '',
          localFile: ''
        })
      }
      this.$store.dispatch('chat/sendPendingChat')
      this.groupAdd = false
    },
    async leftGroup () {
      await this.$store.dispatch('chat/leftGroup', {
        _id: this.$store.getters['chat/currentUser'].convid
      })
      await this.$store.dispatch('chat/saveChat', {
        text: JSON.stringify({
          code: 'left_from_group',
          userId: this.$store.state.chat.user._id,
          userName: this.$store.state.chat.user.name
        }),
        mediaType: 11,
        mediaId: '',
        localFile: ''
      })
      this.$store.dispatch('chat/sendPendingChat')
      this.groupDetail = false
    },
    add (contact) {
      const _c = _.find(this.selected, r => r._id === contact._id)
      if (!_c) {
        this.selected = [
          ...this.selected,
          {
            ...contact
          }
        ]
      } else {
        console.log('reemove', this.selected)
        _.remove(this.selected, r => r._id === contact._id)
        this.selected = [...this.selected]
      }
      console.log(this.selected)
    },
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
    async scrollTo (index) {
      console.log('wayae scroll')
      let stop = false
      let ele = document.getElementById('id-' + index.params.refId)
      let offset = null
      this.disableScrollCheck = true
      console.log('ketemu', ele)
      while (!stop) {
        if (ele) {
          offset = ele.offsetTop
          stop = true
          console.log('target', ele)
        } else {
          try {
            const ds = await this.$store.dispatch('chat/loadMessage', this.eachLoad)
            if (ds.length === 0) {
              throw Error()
            }
            await new Promise((resolve, reject) => {
              this.$nextTick(() => {
                setTimeout(() => {
                  resolve()
                }, 200)
              })
            })
            ele = document.getElementById('id-' + index.params.refId)
          } catch (error) {
            stop = true
          }
        }
      }
      if (offset !== null) {
        this.$store.commit('chat/updateMessage', {
          _id: index.params.refId,
          hightlight: true
        })
        setTimeout(() => {
          this.$store.commit('chat/updateMessage', {
            _id: index.params.refId,
            hightlight: false
          })
        }, 1000)
        console.log('message', offset)
        this.$refs.scrollArea.setScrollPosition(offset, 100)
        setTimeout(() => {
          this.disableScrollCheck = false
        }, 200)
      }
    },
    handleHold2 (index) {
      const a = _.find(this.$store.getters['chat/messages'], (m) => {
        return m.selected === true
      })
      console.log('click')
      if (a) {
        console.log('siwtch')
        this.$store.dispatch('chat/switchSelected', index._id)
      }
    },
    clearSelected () {
      this.$store.commit('chat/clearSelected')
    },
    onScrollSecond () {
      if (this.$refs.scrollArea.scrollPosition === 0 && this.fistDone && this.loadNotDone && !this.fetching && !this.disableScrollCheck) {
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
            const ext = file.name.split('.').pop()
            fileEntry.copyTo(dir, uid() + '.' + ext, (file) => {
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
      // 0: text
      //
      const params = {}
      if (this.replyMessage) {
        params.refId = this.replyMessage._id
      }
      const a = await this.$store.dispatch('chat/saveChat', {
        text: this.message,
        mediaType: 0,
        mediaId: '',
        localFile: '',
        params
      })
      this.closeReply()
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
    },
    reply () {
      this.replyMessage = _.find(this.$store.getters['chat/messages'], (m) => {
        return m.selected === true
      })
      console.log(this.replyMessage)
      this.clearSelected()
    },
    closeReply () {
      this.replyMessage = null
    },
    async forward () {
      const listTarget = await this.$refs.userSelect.open({
        exclude: this.$store.state.chat.currentUserId
      })
      await this.$store.dispatch('chat/forwardSelected', {
        listTarget
      })
      this.clearSelected()
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
