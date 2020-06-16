<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>

        <q-toolbar-title>
          Quasar App
        </q-toolbar-title>

        <div>
          <q-btn flat dense icon="more_vert">
            <q-menu>
              <q-list style="min-width: 100px">
                <q-item clickable v-close-popup @click="broadcast()">
                  <q-item-section>New Broadcast</q-item-section>
                </q-item>
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
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page padding v-if="contacts.length > 0 && convs.length > 0">
        <q-list bordered>
          <q-item v-for="conv in convs" :key="conv.rowid" class="q-my-sm" clickable v-ripple  @click="$router.push('/detail/'+conv.convid)">
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white" v-if="!conv.isBroadcast">
                 {{ conv.name.substring(0,1).toUpperCase() }}
              </q-avatar>
              <q-avatar color="primary" text-color="white" v-if="conv.isBroadcast" icon="volume_up">
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ conv.name }}</q-item-label>
              <q-item-label caption lines="1">{{ conv.message }}</q-item-label>
            </q-item-section>

            <q-item-section side v-if="conv.unreadCount > 0">
              <q-badge color="green">
                {{conv.unreadCount}}
              </q-badge>
            </q-item-section>
          </q-item>
        </q-list>

        <q-page-sticky position="bottom-right" :offset="[18, 18]">
          <q-btn fab icon="question_answer" color="accent"  @click="$router.push('/createChat')"/>
        </q-page-sticky>
      </q-page>
      <q-page padding v-if="contacts.length > 0 && convs.length == 0" class="flex flex-center">
        <q-btn unelevated rounded color="primary" label="Start Message"  icon="question_answer" v-if="!loading" @click="$router.push('/createChat')"/>
      </q-page>
      <q-page padding v-if="contacts.length == 0" class="flex flex-center">
        <q-btn unelevated rounded color="primary" label="Sync Contact"  icon="autorenew" v-if="!loading" @click="syncMain"/>
        <q-circular-progress v-if="loading"
          indeterminate
          size="50px"
          color="primary"
          class="q-ma-md"
        />
      </q-page>
    </q-page-container>

    <q-dialog v-model="prompt" full-width full-height>
      <q-card>
        <q-card-section>
          <div class="text-h6">Choose Contact</div>
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: 50vh" class="scroll">
          <q-list bordered>
            <q-item v-for="contact in contacts" :key="contact.id" class="q-my-sm" clickable v-ripple @click="$router.push('/detail/'+contact._id)">
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
                <q-icon name="chat_bubble" color="green" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <dialogSelectUser ref="userSelect"/>
  </q-layout>
</template>

<script>
import dialogSelectUser from './dialogSelectUser.vue'

export default {
  components: {
    dialogSelectUser
  },
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
    async broadcast () {
      try {
        const listTarget = await this.$refs.userSelect.open({
          group: false
        })
        const bc = await this.$store.dispatch('chat/createBroadCast', listTarget)
        console.log('listTarget', bc)
      } catch (error) {
        console.log('batal', error)
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
