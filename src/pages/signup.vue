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
        <div class="row full-width">
            <q-card square class="no-shadow full-width" >
              <q-card-section class="bg-primary">
                <h4 class="text-h5 text-white q-my-md">Registration</h4>
                <div class="absolute-bottom-right q-pr-md" style="transform: translateY(50%);">
                  <q-btn fab icon="close" color="secondary" />
                </div>
              </q-card-section>
              <q-card-section>
                <q-form class="q-px-sm q-pt-xl q-pb-lg">
                  <q-input square clearable v-model="nameId" type="text" label="Name">
                    <template v-slot:prepend>
                      <q-icon name="people" />
                    </template>
                  </q-input>
                  <q-select
                    v-model="country"
                    :options="options"
                    label="Standard"
                  >
                    <template v-slot:prepend>
                      <q-icon name="flag" />
                    </template>
                    <template v-slot:option="scope">
                      <q-item
                        v-bind="scope.itemProps"
                        v-on="scope.itemEvents"
                      >
                        <q-item-section avatar>
                          <span :class="'flag-icon '+scope.opt.icon"></span>
                        </q-item-section>
                        <q-item-section>
                          <q-item-label v-html="scope.opt.label" />
                        </q-item-section>
                        <q-item-section side>{{scope.opt.code}}</q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                  <q-input square clearable v-model="phoneNumber" type="number" :prefix="cCode">
                    <template v-slot:prepend>
                      <q-icon name="call" />
                    </template>
                  </q-input>
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
                <q-btn unelevated size="lg" color="primary" class="full-width text-white" label="Get Started" @click="signUp"/>
              </q-card-actions>
              <q-card-section class="text-center q-pa-sm">
                <p class="text-grey-6">Return to login</p>
              </q-card-section>
            </q-card>
          </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
const otps = [
  {
    label: 'Indonesia',
    value: 'id',
    description: '',
    icon: 'flag-icon-id',
    code: '+62'
  },
  {
    label: 'Singapure',
    value: 'sg',
    description: '',
    icon: 'flag-icon-sg',
    code: '+65'
  },
  {
    label: 'USA',
    value: 'us',
    description: '',
    icon: 'flag-icon-us',
    code: '+1'
  }
]
export default {
  // name: 'PageName',
  data: function () {
    return {
      email: '',
      nameId: '',
      password: '',
      phoneNumber: '',
      country: otps[0],
      options: otps
    }
  },
  computed: {
    cCode () {
      return this.country.code
    }
  },
  methods: {
    signUp () {
      console.log(this.$store)
      this.$store.dispatch('chat/doSignup', {
        email: this.email,
        password: this.password,
        nameId: this.nameId,
        phoneNumber: this.country.code + this.phoneNumber,
        country: this.country.value
      }).then(data => {
        console.log(data)
        this.$router.go(-1)
      }).catch(err => {
        console.log(err)
        this.$q.notify(err.message)
      })
    }
  }
}
</script>
