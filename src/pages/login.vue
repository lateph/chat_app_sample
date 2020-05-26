<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          Quasar App
        </q-toolbar-title>
        <q-btn flat round dense icon="add" @click="prompt = true" />
      </q-toolbar>
    </q-header>
    <q-page-container>
      <q-page>
        <div class="row">
          <q-card square class="full-width no-shadow">
            <q-card-section class="bg-primary">
              <h4 class="text-h5 text-white q-my-md">Company &amp; Co</h4>
              <div class="absolute-bottom-right q-pr-md" style="transform: translateY(50%);">
                <q-btn fab icon="add" color="secondary" to="/signup"/>
              </div>
            </q-card-section>
            <q-card-section>
              <q-form class="q-px-sm q-pt-xl">
                <q-input square clearable v-model="email" type="email" label="Email">
                  <template v-slot:prepend>
                    <q-icon name="email" />
                  </template>
                </q-input>
                <q-input square clearable v-model="password" type="password" label="Password">
                  <template v-slot:prepend>
                    <q-icon name="lock" />
                  </template>
                </q-input>
              </q-form>
            </q-card-section>
            <q-card-actions class="q-px-lg">
              <q-btn unelevated size="lg" color="primary" class="full-width text-white" label="Sign In" @click="login" />
            </q-card-actions>
            <q-card-section class="text-center q-pa-sm">
              <p class="text-grey-6">Forgot your password?</p>
            </q-card-section>
          </q-card>
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
      email: '',
      password: '087859500822'
    }
  },
  methods: {
    login () {
      console.log(this.$store)
      this.$store.dispatch('chat/doLogin', {
        strategy: 'local',
        email: this.email,
        password: this.password
      }).then(data => {
        console.log(data)
        this.$router.replace('/feeds')
      }).catch(err => {
        console.log('err login ', err)
        if (err && err.message) {
          this.$q.notify(err.message)
        } else {
          this.$q.notify('login fail')
        }
      })
    }
  }
}
</script>
