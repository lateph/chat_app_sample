/*
export function someAction (context) {
}
*/
var _ = require('lodash')
var db = null
import { uid, LocalStorage } from 'quasar'
import { jwtDecode } from 'jwt-js-decode'

// signup action
export async function doSignup ({ state }, { email, password, name, country, phone }) {
  return this._vm.$appFeathers.service('users').create({
    email,
    password,
    name,
    phone,
    country
  })
}

/*
  1. login socket
  2. reload contact after success login
  3. update fcm token
  4. start open database
*/
export async function doLogin ({ state, dispatch, commit }, { email, password, strategy }) {
  const message = await this._vm.$appFeathers.service('authentication').create({
    email,
    password,
    strategy
  })
  console.log(message)
  commit('user', message.user)
  dispatch('openDB')
  dispatch('updateToken', message.user._id)
  try {
    await dispatch('loadLocalContact')
  } catch (error) {
  }
  await dispatch('loadConv')
  dispatch('syncChat')

  LocalStorage.set('jwt', message.accessToken)
  return message
}

export async function doLoginJwt ({ state, dispatch, commit }, { jwt }) {
  const message = await this._vm.$appFeathers.service('authentication').create({
    accessToken: jwt,
    strategy: 'jwt'
  })
  commit('user', message.user)
  dispatch('syncChat')
  dispatch('updateToken', message.user._id)
  LocalStorage.set('jwt', message.accessToken)
  return message
}

export async function localDataLoad ({ state, dispatch, commit }, { jwt }) {
  const decode = jwtDecode(jwt)
  console.log('localDataLoad', decode)
  // @Todo check jwt to match
  commit('user', {
    _id: decode.payload.sub,
    phone: decode.payload.phone
  })
  console.log('user decodde', decode)
  dispatch('openDB')
  try {
    await dispatch('loadLocalContact')
  } catch (error) {
  }
  await dispatch('loadConv')
  return true
}

export async function doLogout ({ commit }) {
  commit('logout')
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

export function loadLocalContact ({ state, commit }) {
  console.log('load local contact')
  return new Promise((resolve, reject) => {
    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM contact', [], (tx, rs) => {
        let selects = rs.rows._array
        if (!selects) {
          selects = rs.rows
        }
        console.log('contact', selects.length)
        if (selects.length > 0) {
          commit('contacts', selects)
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

export function saveChat ({ state, commit }, { text, mediaId }) {
  return new Promise((resolve, reject) => {
    db.transaction(async (tx) => {
      const _uid = uid()
      tx.executeSql('INSERT INTO message VALUES (?,?,?,?,?,?,?,?,?)', [_uid, text, state.currentUserId, state.user._id, JSON.stringify([state.currentUserId]), new Date().toISOString(), new Date().toISOString(), 0, ''], (tx, result) => {
        commit('addMessage', {
          message: text,
          rowid: result.insertId,
          _id: _uid,
          contact: state.currentUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
          fromid: state.user._id,
          status: 0
        })
      })
    }, (e) => {
      reject(e)
    }, () => {
      resolve(true)
    })
  })
}

export async function sendChat ({ state }, { text, mediaId, uid, to }) {
  const retMessage = await this._vm.$appFeathers.service('messages').create({
    from: state.user._id,
    to: to,
    text: text,
    mediaId: mediaId,
    uid: uid,
    status: 1
  })
  if (mediaId) {
    this._vm.$appFeathers.service('media').patch(null, { to: to }, { query: { _id: mediaId } })
  }
  return retMessage
}

export async function sendPendingChat ({ dispatch }) {
  db.transaction((tx) => {
    tx.executeSql('SELECT * FROM message WHERE status = ?', [0], (tx, messageResult) => {
      let selects = messageResult.rows._array
      if (!selects) {
        selects = messageResult.rows
      }
      if (selects.length > 0) {
        _.forEach(selects, (r) => {
          dispatch('sendChat', {
            text: r.message,
            mediaId: r.mediaId,
            uid: r._id,
            to: JSON.parse(r.toids)
          })
        })
      }
    })
  }, (e) => {
    console.log('update conv gagal', e)
  }, () => {
    console.log('update conv success')
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
  dispatch('updateConvToZero', data)
  return await dispatch('loadMessage')
}

export function removeCurrent ({ state, commit }) {
  console.log('remove current')
  this._vm.$appFeathers.service('onlineuser').patch(null, { $pull: { subcriber: state.user._id } }, { query: { userId: state.currentUserId } })
  commit('removeCurrent')
}

export function loadMessage ({ state, commit, dispatch }, data) {
  return new Promise((resolve, reject) => {
    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM message WHERE convid=? ORDER BY createdAt DESC Limit ? OFFSET ?', [state.currentUserId, 8, state.dataMessage.length], (tx, rs) => {
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

export function loadConv ({ state, commit, dispatch }) {
  return new Promise((resolve, reject) => {
    db.transaction(function (tx) {
      // tx.executeSql('SELECT * FROM message WHERE rowid in (SELECT MAX(rowid) from message GROUP BY convid)', [], (tx, rs) => {
      tx.executeSql('SELECT * FROM conv ORDER BY updatedAt DESC', [], (tx, rs) => {
        console.log('cok ile', rs.rows)
        let selects = rs.rows._array
        if (!selects) {
          selects = rs.rows
        }
        commit('setConv', selects)
        resolve(true)
      }, function (tx, error) {
        console.log('total user e ', error)
        resolve(true)
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

/*
  rereive all contact from phone
  save contact to db
*/
export async function syncContact ({ state, commit, dispatch }) {
  let phoneNumbers = ['+628123466701', '+6597216346', '+628123466702']
  if (navigator.contacts) {
    phoneNumbers = await new Promise((resolve, reject) => {
      let phoneNumbers = []
      var options = new window.ContactFindOptions()
      options.multiple = true
      options.hasPhoneNumber = true
      var fields = ['phoneNumbers']
      navigator.contacts.find(fields, async (contacts) => {
        phoneNumbers = []
        for (var i = 0; i < contacts.length; i++) {
          const _c = contacts[i]
          console.log(_c)
          console.log(_c.phoneNumbers)
          if (_c.phoneNumbers) {
            for (var j = 0; j < _c.phoneNumbers.length; j++) {
              if (_c.phoneNumbers[j].value) {
                try {
                  let str = _c.phoneNumbers[j].value.replace(/[^0-9+]/g, '')
                  if (str.charAt(0) === '0') {
                    str = state.user.phone.substring(0, 3) + str.substring(1)
                  }
                  if (phoneNumbers.indexOf(str) < 0 && str !== state.user.phone) {
                    phoneNumbers.push(str)
                  }
                } catch (error) {
                }
              }
            }
          }
        }
        resolve(phoneNumbers)
      }, (contactError) => {
        console.log('error')
        reject(contactError)
      }, options)
    })
  }

  const index = phoneNumbers.indexOf(state.user.phone)
  if (index > -1) {
    phoneNumbers.splice(index, 1)
  }

  return await new Promise((resolve, reject) => {
    // console.log(phoneNumbers)
    console.log('%c-phoneNumbers', 'color: yellow;', JSON.stringify(phoneNumbers))

    this._vm.$appFeathers.service('users').find({ query: { $limit: 99999, phone: phoneNumbers } }).then((data) => {
      console.log('contact found', data.data)
      db.transaction((tx) => {
        tx.executeSql('DELETE FROM contact', [])
        _.forEach(data.data, (row) => {
          tx.executeSql('INSERT INTO contact VALUES (?,?,?,?,?)', [row._id, row.email, row.name, row.phone, row.country])
        })
      }, function (error) {
        console.log('Transaction ERROR: ' + error.message)
        reject(error)
      }, function () {
        resolve(true)
      })
    }).catch((e) => {
      reject(e)
    })
  })
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
  this._vm.$db = db
  db.transaction((tx) => {
    tx.executeSql('CREATE TABLE IF NOT EXISTS message (_id, message, convid, fromid, toids, createdAt, updatedAt ,status, recipientStatus)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS conv (message, convid, name, phone, unreadCount INTEGER DEFAULT 0, updatedAt)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS contact (_id, email, name, phone, country)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS convididx ON message (convid)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS _ididx ON message (_id)')
    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS phone ON contact (phone)')
  }, (error) => {
    console.log('Transaction ERROR: ' + error.message)
  }, () => {
    console.log('create database OK')
  })
}

export async function findContactDetail (state, id) {
  let c = _.find(state.contacts, c => c._id === id)
  if (!c) {
    c = await this._vm.$appFeathers.service('users').get(id)
  }
  return c
}

export async function addMessage ({ state, commit, dispatch }, data) {
  console.log('saving message :', data)
  // get lawan chat
  // @todo support group chat
  let id = ''
  let recipientStatus = ''
  if (data.from === state.user._id) {
    id = data.to[0]
    recipientStatus = JSON.stringify(data.recipientStatus)
  } else {
    id = data.from
  }

  // update conv
  // this will make list chat have last message inserted
  const contactDetail = await dispatch('findContactDetail', id)
  dispatch('updateConv', {
    message: data.text,
    convid: id,
    name: contactDetail.name,
    phone: contactDetail.phone,
    updatedAt: data.createdAt
  })

  // check if data with id exists
  // if own chat it will be exists with same id since save to db first then send
  // reason is to support send message while offline
  const dataExists = await dispatch('getMessageByUID', data.uid)
  const to = JSON.stringify(data.to)

  let rowId = ''
  if (dataExists) {
    // update message
    const resultUpdate = await dispatch('updateMessageStatus', [data.status, recipientStatus, data.uid])
    rowId = dataExists.rowId
    console.log('resultUpdate', resultUpdate)
  } else {
    const resultInsert = await dispatch('insertMessage', [data.uid, data.text, id, data.from, to, data.createdAt, data.updatedAt, data.status, recipientStatus])
    rowId = resultInsert.insertId
  }

  // if user already in chat detail add message to list current chat
  if (id === state.currentUserId) {
    if (dataExists) {
      commit('updateMessage', {
        message: data.text,
        rowid: rowId,
        _id: data.uid,
        contact: id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        fromid: data.from,
        status: data.status
      })
    } else {
      commit('addMessage', {
        message: data.text,
        rowid: rowId,
        _id: data.uid,
        contact: id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        fromid: data.from,
        status: data.status
      })
    }

    // send chat status that already read
    if (id === state.currentUserId && data.from !== state.user._id) {
      dispatch('sendReadStatus', { uids: [data.uid], to: data.from, status: 3 })
      if (!state.appRunning) {
        dispatch('findContactDetail', id).then((c) => {
          cordova.plugins.notification.local.schedule({
            title: c.name,
            text: data.text,
            foreground: true
          })
        })
      }
    }
  } else {
    console.log('open local notif')
    if (data._source === 'socket' && cordova && cordova.plugins && cordova.plugins.notification) {
      dispatch('findContactDetail', id).then((c) => {
        cordova.plugins.notification.local.schedule({
          title: c.name,
          text: data.text,
          foreground: true
        })
      })
    }
  }
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
    // console.log('setReadCurrentChat 1')
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

export async function doSendMedia ({ state, commit, dispatch }) {
  const img = await new Promise((resolve, reject) => {
    navigator.camera.getPicture((imageURI) => {
      console.log('%c-imageURI', 'color: yellow;', imageURI)
      resolve(imageURI)
    }, (error) => {
      reject(error)
    }, {
      quality: 50,
      sourceType: window.Camera.PictureSourceType.PHOTOLIBRARY,
      destinationType: window.Camera.DestinationType.FILE_URI,
      encodingType: window.Camera.EncodingType.JPEG
    })
  })
  const ret = await dispatch('uploadFile', { img })
  // return ret
  const mediaId = ret.data._id
  console.log(mediaId)
  await dispatch('sendChat', {
    mediaId
  })
}

export async function uploadFile ({ commit, state, rootState }, { img, type }) {
  const fileCompress = await new Promise((resolve, reject) => {
    let options = {}
    options = {
      uri: img,
      folderName: 'compress',
      quality: 90,
      width: 300,
      height: 300,
      base64: false,
      fit: false
    }
    window.ImageResizer.resize(options,
      function (image) {
        console.log('file compress: ', image)
        resolve(image)
      }, function (e) {
        console.log('error compress', e)
        reject(e)
      })
  })
  console.log('file comprese', fileCompress)
  return await new Promise((resolve, reject) => {
    var fd = new FormData()
    window.resolveLocalFileSystemURL(fileCompress, (fileEntry) => {
      console.log('file entry', fileEntry)
      fileEntry.file((file) => {
        var reader = new FileReader()
        reader.onloadend = (e) => {
          var imgBlob = new Blob([this.result], { type: type })
          fd.append('file', imgBlob)
          console.log(fd, fd)

          this._vm.$chatAxios.post('/uploads', fd, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }).then(retAxios => {
            console.log('sukses upload')
            resolve(retAxios)
          }).catch(e => {
            reject(e)
          })
          // post form call here
        }
        reader.onerror = function (e) {
          reject(e)
        }
        reader.readAsArrayBuffer(file)
      }, function (e) {
        reject(e)
      })
    }, function (e) {
      reject(e)
    })
  })
}
