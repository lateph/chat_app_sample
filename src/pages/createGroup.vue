<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense icon="arrow_back_ios" @click="$router.go(-1)" />

        <div class="row items-center justify-between full-width">
          <div class="row items-center ">
            <div>
              <div class="text-weight-medium">
                New Group
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
              <q-btn fab icon="arrow_forward" color="accent"  @click="save()"/>
            </q-page-sticky>
        </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
var _ = require('lodash')
export default {
  // name: 'PageName',
  data: function () {
    return {
      prompt: false,
      address: '',
      loading: false,
      selected: []
    }
  },
  computed: {
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
    contacts: {
      get () {
        return this.$store.state.chat.contacts
      }
    },
    convs: {
      get () {
        return this.$store.state.chat.convs
      }
    }
  },
  mounted () {
    this.$store.commit('chat/clearMessage')
  },
  methods: {
    save () {
      this.$store.commit('chat/setSelectedForGroup', this.selected)
      this.$router.push('/createGroupDetail')
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
    async syncMain () {
      this.loading = true
      try {
        await this.$store.dispatch('chat/syncContact')
        console.log('sync contact done')
        await this.$store.dispatch('chat/loadLocalContact')
        this.loading = false
      } catch (error) {
        console.log(error)
        this.loading = false
      }
    },
    startMessage () {
      this.prompt = true
    },
    logout () {
      this.$store.dispatch('chat/doLogout').then(() => {
        this.$router.replace('/')
      })
    }
  }
}
</script>
