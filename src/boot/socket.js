import 'flag-icon-css/css/flag-icon.css'
// import something here
const feathers = require('@feathersjs/feathers')
const socketio = require('@feathersjs/socketio-client')
const io = require('socket.io-client')
import axios from 'axios'
const baseUrl = 'http://192.168.1.107:3030'
// const baseUrl = 'http://159.89.205.235:3030'
const chatInstance = axios.create({
  baseURL: baseUrl
})

import VueZoomer from 'vue-zoomer'
// const VueSocketIO = require('vue-socket.io')
// import createSocketIoPlugin from 'vuex-socketio';

const socket = io(baseUrl)
// const socket = io('http://localhost:3030')
// const socket = io('http://159.89.205.235:3030')
// const socketPlugin = createSocketIoPlugin(socket);

// const socket = io('http://159.89.205.235:3030')
import { LocalStorage } from 'quasar'

const app = feathers()
// Set up Socket.io client with the socket
app.configure(socketio(socket))
// "async" is optional
const jwt = LocalStorage.getItem('jwt')

const _deviceready = (Vue, store, router) => {
  Vue.prototype.$socket = socket
  Vue.prototype.$appFeathers = app
  Vue.prototype.$chatAxios = chatInstance

  socket.on('connect', () => {
    if (jwt) {
      store.dispatch('chat/doLoginJwt', {
        jwt
      }).then(data => {
      })
    }
  })

  app.service('messages')
    .on('created', message => {
      console.log('%c add message ', 'background: #222; color: #bada55')
      console.log(message)
      store.dispatch('chat/addMessage', {
        ...message,
        _source: 'socket'
      }).then(() => {
      }).catch((e) => {
        console.log(e)
        console.log(e.message)
      })
    })
  app.service('onlineuser')
    .on('patched', message => {
      store.commit('chat/setCurrentOnlineUser', message)
    })
  app.service('customs')
    .on('created', message => {
      // if (message.text === 'typing' || message.text === 'untyping') {
      store.dispatch('chat/setCustoms', message)
      // }
    })
  app.service('readevent')
    .on('created', message => {
      console.log('%c readevent ', 'background: #222; color: #bada55')
      // if (message.text === 'typing' || message.text === 'untyping') {
      store.dispatch('chat/readMessage', message)
      // }
    })
  app.service('users')
    .on('created', message => {
      // if (message.text === 'typing' || message.text === 'untyping') {
      store.dispatch('chat/reloadContact', message)
      // }
    })
  app.service('group')
    .on('created', async group => {
      console.log('%c group created', 'background: #222; color: #bada55')
      // if (message.text === 'typing' || message.text === 'untyping') {

      // patch fuck feathers
      const g = await (store.dispatch('chat/getGroup', group._id))
      console.log('group patched', g)
      store.dispatch('chat/newGroup', g)
      // }
    })
  app.service('group')
    .on('patched', async group => {
      console.log('%c group patched', 'background: #222; color: #bada55')
      // if (message.text === 'typing' || message.text === 'untyping') {
      const g = await (store.dispatch('chat/getGroup', group._id))
      console.log('group patched', g)

      store.dispatch('chat/newGroup', g)
      // }
    })

  app.service('update')
    .on('created', group => {
      console.log('update created', group)
      // if (message.text === 'typing' || message.text === 'untyping') {
      store.dispatch('chat/prosesUpdate', group)
      // }
    })

  console.log('added listener')
}

export default async ({ router, store, Vue }) => {
  // something to do
  // console.log(router)
  // socketPlugin(store)
  Vue.use(require('vue-moment'))
  Vue.use(VueZoomer)

  if (window.cordova) {
    document.addEventListener('deviceready', () => {
      _deviceready(Vue, store, router)
    }, false)
    document.addEventListener('pause', () => {
      store.commit('chat/pause')
    }, false)
    document.addEventListener('resume', () => {
      store.commit('chat/resume')
    }, false)
  } else {
    _deviceready(Vue, store, router)
  }

  setTimeout(() => {
    if (jwt) {
      store.dispatch('chat/localDataLoad', {
        jwt
      }).then(data => {
        console.log('okebanget', data)
      })
      router.replace('/feeds')
      if (window.navigator.splashscreen) {
        navigator.splashscreen.hide()
      }
    } else {
      router.replace('/')
      if (window.navigator.splashscreen) {
        navigator.splashscreen.hide()
      }
    }
  }, 500)

  // Vue.use(new VueSocketIO({
  //   store,
  //   connection: socket,
  //   actionPrefix: 'SOCKET_',
  //   mutationPrefix: 'SOCKET_'
  // }))
}
