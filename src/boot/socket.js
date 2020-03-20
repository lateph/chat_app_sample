// import something here
const feathers = require('@feathersjs/feathers')
const socketio = require('@feathersjs/socketio-client')
const io = require('socket.io-client')
// const VueSocketIO = require('vue-socket.io')
// import createSocketIoPlugin from 'vuex-socketio';

const socket = io('http://localhost:3030')
// const socketPlugin = createSocketIoPlugin(socket);

// const socket = io('http://159.89.205.235:3030')
import { LocalStorage } from 'quasar'

const app = feathers()
// Set up Socket.io client with the socket
app.configure(socketio(socket))
// "async" is optional
export default async ({ router, store, Vue }) => {
  // something to do
  console.log(router)
  // socketPlugin(store)
  Vue.use(require('vue-moment'))
  Vue.prototype.$socket = socket
  // Vue.use(new VueSocketIO({
  //   store,
  //   connection: socket,
  //   actionPrefix: 'SOCKET_',
  //   mutationPrefix: 'SOCKET_'
  // }))
  console.log(store)
  const jwt = LocalStorage.getItem('jwt')
  if (jwt) {
    store.dispatch('chat/doLoginJwt', {
      jwt
    }).then(data => {
      console.log('okebanget')
    }).catch(err => {
      console.log(err)
    })
  }
  app.service('messages')
    .on('created', message => {
      store.commit('chat/addMessage', message)
      // this.data.push(message)
      // alert('jancok x')
    })
  console.log('added listener')
}
