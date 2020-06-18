<template>
    <q-dialog v-model="modal" maximized>
      <q-layout class="bg-white">
        <q-header class="bg-primary">
          <q-toolbar>
            <q-btn flat @click="close()" round dense icon="arrow_back" />
            <q-toolbar-title>{{ user.name }}</q-toolbar-title>
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
                  <!-- Created By user-name, 16/09/2019 -->
                </div>
              </div>
            </q-card>
            <q-list class="bg-white">
              <q-item-label header>Contact Detail</q-item-label>
              <q-item clickable v-ripple>
                <q-item-section>
                    <q-item-label lines="1">{{user.phoneNumber}}</q-item-label>
                    <q-item-label caption>Phone</q-item-label>
                </q-item-section>
            </q-item>
            <q-item clickable v-ripple>
                <q-item-section>
                    <q-item-label lines="1">{{user.country}}</q-item-label>
                    <q-item-label caption>Country</q-item-label>
                </q-item-section>
            </q-item>
            </q-list>
          </q-page>
        </q-page-container>
      </q-layout>
    </q-dialog>
</template>

<script>
var _ = require('lodash')
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
      user: {}
    }
  },
  computed: {
    ...mapState('chat', ['messages']),
    contacts: {
      get () {
        const contact = _.map(_.filter(this.$store.state.chat.contacts, (e) => {
          return this.$store.state.chat.user._id !== e._id
        }), (e) => {
          return {
            _id: e._id,
            name: e.name
          }
        })
        let joined = []
        if (this.group) {
          joined = _.map(this.$store.state.chat.convs, e => {
            return {
              _id: e.convid,
              name: e.name
            }
          })
        }
        return _.filter(_.unionBy(joined, contact, '_id'), (e) => {
          return e._id !== this.exclude
        })
        // return contact
      }
    },
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
    }
  },
  methods: {
    async open (params) {
      this.selected = []
      if (params.userId) {
        this.userId = params.userId
        this.user = await this.$store.dispatch('chat/findContactDetail', this.userId)
      }
      this.modal = true
      return new Promise((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      })
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
