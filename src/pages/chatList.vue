<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>

        <q-toolbar-title>
          Quasar App
        </q-toolbar-title>
        <!-- <q-btn flat round dense icon="add" @click="prompt = true" /> -->
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page padding>
        <q-list bordered>
          <q-item v-for="contact in contacts" :key="contact.id" class="q-my-sm" clickable v-ripple  @click="$router.push('/detail/'+contact._id)">
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white">
                 {{ contact.email.substring(0,1).toUpperCase() }}
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ contact.name }}</q-item-label>
              <q-item-label caption lines="1">{{ contact.email }}</q-item-label>
            </q-item-section>

            <q-item-section side>
              <q-icon name="chat_bubble" color="green" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-page>
    </q-page-container>

    <q-dialog v-model="prompt" persistent>
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
                <q-item-label caption lines="1">{{ contact.email }}</q-item-label>
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
  </q-layout>
</template>

<script>
export default {
  // name: 'PageName',
  data: function () {
    return {
      convs: [],
      prompt: false,
      address: ''
    }
  },
  computed: {
    contacts: {
      get () {
        return this.$store.state.chat.contacts
      }
    }
  },
  sockets: {
    connect: function () {
      console.log(this)
      console.log('socket connected')
    },
    customEmit: function (data) {
      console.log('this method was fired by the socket server. eg: io.emit("customEmit", data)')
    }
  },
  mounted () {
    this.$store.commit('chat/clearMessage')
  },
  methods: {
  }
}
</script>
