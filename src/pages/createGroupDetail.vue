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
            <q-btn flat dense icon="more_vert"  />
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
            <q-input v-model="name" label="Group Subject" class="col-grow" />
          </div>

          <q-card-section class="bg-grey-3">
            <q-btn
              fab
              color="accent"
              icon="done"
              class="absolute"
              style="top: 0; right: 12px; transform: translateY(-50%);"
              @click="createGroup()"
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
export default {
  // name: 'PageName',
  data: function () {
    return {
      prompt: false,
      address: '',
      loading: false,
      selected: [],
      name: ''
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
    async createGroup () {
      const group = await this.$store.dispatch('chat/createGroup', {
        name: this.name,
        image: ''
      })
      await this.$store.dispatch('chat/newGroup', group)
      // will be fixed for better code
      console.log('group created', group)
      await this.$store.dispatch('chat/setCurrent', group._id)
      console.log('group setted', this.$store)
      console.log('group setted', JSON.stringify(this.$store.state.chat.contacts))
      console.log('group setted', JSON.stringify(this.$store.state.chat.currentUserId))
      console.log('group setted', this.$store.getters['chat/currentUser'])

      await this.$store.dispatch('chat/saveChat', {
        text: JSON.stringify({
          code: 'create_group',
          user: this.$store.state.chat.user._id,
          userName: this.$store.state.chat.user.name,
          groupName: group.name
        }),
        mediaType: 11,
        mediaId: '',
        localFile: ''
      })
      this.$store.dispatch('chat/sendPendingChat')

      console.log('chat saved')

      this.$router.push('/detail/' + group._id)

      console.log('crate success', group)
    }
  }
}
</script>
