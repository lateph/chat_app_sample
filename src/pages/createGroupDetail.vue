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
                Add Subject
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
      <q-page class="bg-grey-3">
        <q-card class="no-shadow">
          <div class="flex items-center q-gutter-sm q-pa-sm">
            <q-btn
              round
              color="grey"
              icon="camera"
            />
            <q-input v-model="text" label="Group Subject" class="col-grow" />
          </div>

          <q-card-section class="bg-grey-3">
            <q-btn
              fab
              color="accent"
              icon="done"
              class="absolute"
              style="top: 0; right: 12px; transform: translateY(-50%);"
            />
          </q-card-section>

        </q-card>
        <div>
          <p class="q-mt-md">Participant: {{contacts.length}}</p>
          <div class="q-gutter-sm row ">
            <div v-for="contact in contacts" :key="contact._id" class="col-3 justify-center flex">
              <q-avatar color="primary" text-color="white">
                {{ contact.email.substring(0,1).toUpperCase() }}
              </q-avatar>
              <div class="full-width text-center">
                {{ contact.name }}
              </div>
            </div>
          </div>
        </div>
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
    contacts: {
      get () {
        return this.$store.state.chat.selectedCreateGroup
      }
    }
  },
  mounted () {
    this.$store.commit('chat/clearMessage')
  },
  methods: {
    save () {
      this.$store.commit('chat/setSelectedForGroup', this.selected)
      // this.$route.push('/createGroupDetail')
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
