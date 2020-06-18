<template>
    <q-dialog v-model="modal" maximized>
      <q-layout  class="bg-white">
        <q-header elevated>
          <q-toolbar>
            <q-btn flat dense icon="arrow_back_ios" @click="close()" />

            <div class="row items-center justify-between full-width">
              <div class="row items-center ">
                <div>
                  <div class="text-weight-medium">
                    Select Conversation
                  </div>
                  <div style="font-size:11px; margin-top: -3px;">
                    {{selected.length}} of {{contacts.length}} Selected
                  </div>
                </div>
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
                    {{ n.name.substring(0,1).toUpperCase() }}
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
                    {{ contact.name.substring(0,1).toUpperCase() }}
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
              <q-btn fab icon="arrow_forward" color="accent"  @click="save()"/>
            </q-page-sticky>
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
      exclude: [],
      group: true
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
        console.log('exclude', this.exclude)
        return _.filter(_.unionBy(joined, contact, '_id'), (e) => {
          return _.findIndex(this.exclude, (ex) => ex === e._id) === -1
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
    open (params) {
      this.modal = true
      this.selected = []
      if (params.exclude) {
        this.exclude = params.exclude
      }
      if (params.group === false) {
        this.group = params.group
      }
      return new Promise((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      })
    },
    close () {
      this.modal = false
      this.reject()
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
    save () {
      this.modal = false
      this.resolve(this.selected)
    }
  }
}
</script>
