import 'flag-icon-css/css/flag-icon.css'
// import something here
const feathers = require('@feathersjs/feathers')
const socketio = require('@feathersjs/socketio-client')
const io = require('socket.io-client')
import axios from 'axios'
// const baseUrl = 'http://192.168.1.102:3030'
const baseUrl = 'http://159.89.205.235:3030'
const chatInstance = axios.create({
  baseURL: baseUrl
})
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
      if (message.text === 'typing' || message.text === 'untyping') {
        store.commit('chat/setCustoms', message)
      }
    })
  app.service('readevent')
    .on('created', message => {
      console.log('readeven')
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
  console.log('added listener')
}

export default async ({ router, store, Vue }) => {
  // something to do
  // console.log(router)
  // socketPlugin(store)
  Vue.use(require('vue-moment'))

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
