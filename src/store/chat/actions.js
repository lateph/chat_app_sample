/*
export function someAction (context) {
}
*/
var _ = require('lodash')
var db = null
import { uid, LocalStorage } from 'quasar'

export async function doSignup ({ state }, { email, password, name }) {
  return this._vm.$appFeathers.service('users').create({
    email,
    password,
    name
  })
}

export async function doLogin ({ state, dispatch, commit }, { email, password, strategy }) {
  const message = await this._vm.$appFeathers.service('authentication').create({
    email,
    password,
    strategy
  })
  console.log(message)
  commit('user', message.user)
  dispatch('reloadContact')
  dispatch('syncChat')
  dispatch('updateToken', message.user._id)
  dispatch('openDB')
  LocalStorage.set('jwt', message.accessToken)
  return message
}

export async function doLoginJwt ({ state, dispatch, commit }, { jwt }) {
  const message = await this._vm.$appFeathers.service('authentication').create({
    accessToken: jwt,
    strategy: 'jwt'
  })
  commit('user', message.user)
  dispatch('reloadContact')
  dispatch('syncChat')
  dispatch('openDB')
  dispatch('updateToken', message.user._id)
  LocalStorage.set('jwt', message.accessToken)
  return message
}

export async function doLogout ({ commit }) {
  commit('user', {})
  LocalStorage.set('jwt', '')
  this._vm.$socket.disconnect()
  this._vm.$socket.connect()
}

export function updateToken ({ state, commit }, userId) {
  return new Promise((resolve, reject) => {
    console.log('update token start', userId)
    if (!window.cordova) {
      resolve(true)
      return
    }
    const push = window.PushNotification.init({
      android: {
      }
    })

    console.log('alreaddy init')

    push.on('registration', (data) => {
      // data.registrationId
      console.log('registration', data, userId)
      this._vm.$socket.emit('patch', 'users', userId, {
        fcmToken: data.registrationId
      }, (error, message) => {
        if (error) {
          reject(error)
        } else {
          resolve(message)
        }
      })
    })

    push.on('notification', (data) => {
      console.log('notif data', data)
    })

    push.on('error', (e) => {
      console.log('notif error', e)
    })
  })
}

export async function reloadContact ({ state, commit }) {
  const data = await this._vm.$appFeathers.service('users').find({ query: { $sort: { updateAt: -1 }, _id: { $ne: state.user._id } } })
  commit('contacts', data.data)
}

export async function sendChat ({ state, commit }, { text }) {
  return await this._vm.$appFeathers.service('messages').create({
    from: state.user._id,
    to: [state.currentUserId],
    text: text,
    uid: uid(),
    status: 1
  })
}

export async function setReceive ({ dispatch }, id) {
  return await this._vm.$appFeathers.service('messages').remove(id)
}

export async function sendReadStatus ({ state }, { uids, to, status }) {
  await this._vm.$appFeathers.service('readevent').create({
    uids: uids,
    to: to,
    from: state.user._id,
    status
  })
}

export async function setCurrent ({ state, commit, dispatch }, data) {
  commit('setCurrent', data)

  // subcribe to user online status
  this._vm.$appFeathers.service('onlineuser').patch(null, { $push: { subcriber: state.user._id } }, { query: { userId: state.currentUserId } })
  dispatch('setReadCurrentChat')
  return await dispatch('loadMessage')
}

export function removeCurrent ({ state, commit }) {
  console.log('remove current')
  this._vm.$appFeathers.service('onlineuser').patch(null, { $pull: { subcriber: state.user._id } }, { query: { userId: state.currentUserId } })
  commit('removeCurrent')
}

export function loadMessage ({ state, commit, dispatch }, data) {
  console.log('start load message 1')
  return new Promise((resolve, reject) => {
    console.log('start load message 2')
    db.transaction(function (tx) {
      console.log('start load message 3')
      tx.executeSql('SELECT * FROM message WHERE convid=? ORDER BY createdAt DESC Limit ? OFFSET ?', [state.currentUserId, 8, state.dataMessage.length], (tx, rs) => {
        console.log('cok ile', rs.rows)
        let selects = rs.rows._array
        if (!selects) {
          selects = rs.rows
        }
        if (selects.length > 0) {
          commit('insertMessages', [...selects].reverse())
          resolve(selects)
        } else {
          console.log('empty user')
          reject('user g ketemu')
        }
      }, function (tx, error) {
        console.log('total user e ', error)
        reject(error)
      })
    })
  })
}

/*
  this function is for sync message data while device / socket offline
  1. get all message to me
  2. send send status = 2 that we received the message
  3. save message to db
  4. receive all readevent when we offline
*/
export async function syncChat ({ state, commit, dispatch }) {
  const data = await this._vm.$appFeathers.service('messages').find({ query: { $limit: 1000, $sort: { createdAt: 1 }, to: { $in: [state.user._id] } } })

  const p = _.partition(data.data, (o) => { return o.from })
  _.forEach(p, async messages => {
    if (messages.length > 0) {
      dispatch('sendReadStatus', {
        uids: _.map(messages, message => message.uid),
        to: messages[0].from,
        from: state.user._id,
        status: 2
      })
    }
  })

  _.forEach(data.data, (r) => {
    dispatch('addMessage', { ...r, status: 2 })
    dispatch('setReceive', r)
  })

  const dataReadEvents = await this._vm.$appFeathers.service('readevent').find({ query: { $limit: 99999, $sort: { createdAt: 1 }, to: state.user._id } })
  _.forEach(dataReadEvents.data, (r) => {
    dispatch('readMessage', r)
    this._vm.$appFeathers.service('readevent').remove(r._id)
  })

  return true
}

export function openDB ({ state }) {
  console.log(window.sqlitePlugin)
  if (window.sqlitePlugin) {
    db = window.sqlitePlugin.openDatabase({ name: 'chat04' + state.user._id + '.db', location: 'default' }, function (db) {}, function (error) { console.log('Open database ERROR: ' + JSON.stringify(error)) })
    console.log('DB: SQLite')
  } else {
    db = window.openDatabase('chat04' + state.user._id, '0.1', 'My list', 200000)
    console.log('DB: WebSQL')
  }
  db.transaction((tx) => {
    tx.executeSql('CREATE TABLE IF NOT EXISTS message (_id, message, convid, fromid, toids, createdAt, updatedAt ,status, recipientStatus)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS convididx ON message (convid)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS _ididx ON message (_id)')
  }, (error) => {
    console.log('Transaction ERROR: ' + error.message)
  }, () => {
    console.log('create database OK')
  })
}

export function addMessage ({ state, commit, dispatch }, data) {
  db.transaction((tx) => {
    console.log('saving message :', data)
    let id = ''
    let recipientStatus = ''
    if (data.from === state.user._id) {
      id = data.to[0]
      recipientStatus = JSON.stringify(data.recipientStatus)
    } else {
      id = data.from
    }
    const to = JSON.stringify(data.to)
    tx.executeSql('INSERT INTO message VALUES (?,?,?,?,?,?,?,?,?)', [data.uid, data.text, id, data.from, to, data.createdAt, data.updatedAt, data.status, recipientStatus], (tx, result) => {
      console.log('insert success', result.insertId)
      if (id === state.currentUserId) {
        commit('addMessage', {
          message: data.text,
          rowid: result.insertId,
          _id: data.uid,
          contact: id,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          fromid: data.from,
          status: data.status
        })
        if (id === state.currentUserId && data.from !== state.user._id) {
          dispatch('sendReadStatus', { uids: [data.uid], to: data.from, status: 3 })
        }
      }
    })
  }, (error) => {
    console.log('Transaction ERROR: ' + error.message)
  }, () => {
    console.log('message saved OK')
  })
}

// check read message on read event
export function readMessage ({ state, commit, dispatch }, data) {
  console.log('start read message', data)
  db.transaction((tx) => {
    _.forEach(data.uids, (uid) => {
      tx.executeSql('SELECT * FROM message WHERE _id = ?', [uid], (tx, messageResult) => {
        console.log('total message', messageResult)
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0) {
          const message = selects[0]
          var newRecipientStatus = JSON.parse(message.recipientStatus)

          var match = _.find(newRecipientStatus, { _id: data.from })
          var index = _.findIndex(newRecipientStatus, { _id: data.from })
          newRecipientStatus.splice(index, 1, { ...match, status: data.status })

          const status = _.min(newRecipientStatus, o => o.status).status
          console.log('start update')
          tx.executeSql('UPDATE message SET status = ?, recipientStatus = ? WHERE _id = ?', [status, JSON.stringify(newRecipientStatus), uid], (tx, messageResult) => {
            if (state.currentUserId === data.from) {
              commit('updateMessage', { ...message, recipientStatus: newRecipientStatus, status: status })
            }
          })
        }
      })
    })
  }, (error) => {
    console.log('Transaction ERROR: ' + error.message)
  }, () => {
    console.log('message saved OK')
  })
}

export function setReadCurrentChat ({ state, commit, dispatch }, data) {
  return new Promise((resolve, reject) => {
    console.log('setReadCurrentChat 1')
    db.transaction(function (tx) {
      console.log('setReadCurrentChat 2')
      tx.executeSql('SELECT * FROM message WHERE convid=? and status=? and fromid<>? ORDER BY createdAt', [state.currentUserId, '2', state.user._id], (tx, rs) => {
        console.log('total message  xxx', rs)
        let selects = rs.rows._array
        if (!selects) {
          selects = rs.rows
        }
        if (selects.length > 0) {
          const p = _.partition(selects, (o) => { return o.fromid })
          _.forEach(p, messages => {
            if (messages.length > 0) {
              dispatch('sendReadStatus', {
                uids: _.map(messages, message => message._id),
                to: messages[0].fromid,
                from: state.user._id,
                status: 3
              })
              console.log('update selesai1')
              db.transaction(function (tx) {
                tx.executeSql('UPDATE message SET status = 3 WHERE convid=? and status=2 and fromid!=?', [state.currentUserId, state.user._id], (tx, rs) => {
                  console.log('update selesai2')
                })
              }, function (tx, error) {
                console.log('update status ', tx, error)
              })
            }
          })
          resolve(true)
        } else {
          reject('user g ketemu')
        }
      }, function (tx, error) {
        console.log('total user e ', error)
        reject(error)
      })
    })
  })
}
