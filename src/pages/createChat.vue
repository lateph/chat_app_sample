<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense icon="arrow_back_ios" @click="$router.go(-1)" />

        <div class="row items-center justify-between full-width">
          <div class="row items-center ">
            <div>
              <div class="text-weight-medium">
                Select Contact
              </div>
              <div style="font-size:11px; margin-top: -3px;">
                {{contacts.length}} contacts
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
            <q-list bordered>
                <q-item class="q-my-sm" clickable v-ripple @click="$router.replace('/createGroup/')">
                    <q-item-section avatar>
                        <q-avatar color="primary" text-color="white" icon="group" />
                    </q-item-section>
                     <q-item-section>
                    <q-item-label></q-item-label>
                        <q-item-label caption lines="1">New Group</q-item-label>
                    </q-item-section>
                </q-item>
                <q-item v-for="contact in contacts" :key="contact.id" class="q-my-sm" clickable v-ripple @click="$router.replace('/detail/'+contact._id)">
                <q-item-section avatar>
                    <q-avatar color="primary" text-color="white">
                    {{ contact.email.substring(0,1).toUpperCase() }}
                    </q-avatar>
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
      loading: false
    }
  },
  computed: {
    contacts: {
      get () {
        return _.filter(this.$store.state.chat.contacts, (e) => e._id !== this.$store.state.chat.user._id)
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
