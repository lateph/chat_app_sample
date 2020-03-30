// import something here
const feathers = require('@feathersjs/feathers')
const socketio = require('@feathersjs/socketio-client')
const io = require('socket.io-client')
// const VueSocketIO = require('vue-socket.io')
// import createSocketIoPlugin from 'vuex-socketio';

// const socket = io('http://localhost:3030')
const socket = io('http://159.89.205.235:3030')
// const socketPlugin = createSocketIoPlugin(socket);

// const socket = io('http://159.89.205.235:3030')
import { LocalStorage } from 'quasar'

const app = feathers()
// Set up Socket.io client with the socket
app.configure(socketio(socket))
// "async" is optional
let firstCheck = true
const _deviceready = (Vue, store, router) => {
  const jwt = LocalStorage.getItem('jwt')

  Vue.prototype.$socket = socket
  Vue.prototype.$appFeathers = app

  console.log(store)
  socket.on('connect', () => {
    console.log('jwt', router)
    if (jwt) {
      store.dispatch('chat/doLoginJwt', {
        jwt
      }).then(data => {
        console.log('okebanget')
        if (firstCheck) {
          router.replace('/feeds')
          if (window.navigator.splashscreen) {
            navigator.splashscreen.hide()
          }
        }
        firstCheck = false
      }).catch(err => {
        if (err) {
          console.log(err)
        }
        if (firstCheck) {
          router.replace('/')
          if (window.navigator.splashscreen) {
            navigator.splashscreen.hide()
          }
        }
        firstCheck = false
      })
    } else {
      if (firstCheck) {
        router.replace('/')
        if (window.navigator.hide) {
          navigator.splashscreen.hide()
        }
      }
      firstCheck = false
    }
  })

  app.service('messages')
    .on('created', message => {
      store.dispatch('chat/addMessage', message)
    })
  app.service('onlineuser')
    .on('patched', message => {
      console.log('jancok online e berubah', message)
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
      console.log('users')
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
    console.log('cordova present')
    document.addEventListener('deviceready', () => {
      _deviceready(Vue, store, router)
    }, false)
  } else {
    _deviceready(Vue, store, router)
  }

  // Vue.use(new VueSocketIO({
  //   store,
  //   connection: socket,
  //   actionPrefix: 'SOCKET_',
  //   mutationPrefix: 'SOCKET_'
  // }))
}
