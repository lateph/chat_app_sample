/*
export function someAction (context) {
}
*/
var _ = require('lodash')
var db = null
import { LocalStorage } from 'quasar'
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
  console.log('logedin start')
  commit('user', message.user)
  dispatch('openDB')
  await dispatch('loadKey')
  dispatch('updateToken', message.user._id)
  try {
    await dispatch('loadLocalContact')
  } catch (error) {
  }
  await dispatch('loadConv')
  dispatch('sendPendingChat')
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
  await dispatch('loadKey')
  try {
    await dispatch('loadLocalContact')
  } catch (error) {
  }
  await dispatch('loadConv')
  dispatch('sendPendingChat')
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

export async function sendChat ({ state, dispatch, getters }, { text, localFile, uid, to, mediaType, mediaId, createdAt, updatedAt }) {
  let _mediaId = ''
  let thumb = ''
  if (mediaType === 1 || mediaType === '1') {
    const mediaDetail = JSON.parse(mediaId)
    const ret = await dispatch('uploadFile', { img: mediaDetail.file, type: mediaDetail.type, mediaType })
    _mediaId = ret.data._id

    thumb = await new Promise((resolve, reject) => {
      let options = {}
      options = {
        uri: mediaDetail.file,
        folderName: 'compress',
        quality: 10,
        width: 10,
        height: 10,
        base64: true,
        fit: true
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
    await this._vm.$appFeathers.service('media').patch(null, { to: to }, { query: { _id: _mediaId } })
  }
  if (mediaType === 2 || mediaType === '2' || mediaType === 3 || mediaType === '3') {
    console.log('upload file custom')
    const mediaDetail = JSON.parse(mediaId)
    const ret = await dispatch('uploadFile', { img: mediaDetail.file, type: mediaDetail.type, mediaType })
    _mediaId = ret.data._id
    thumb = JSON.stringify({
      type: mediaDetail.mediaType,
      name: mediaDetail.name
    })
  }

  console.log('pubkey', getters.currentUser)
  // @todo group need change
  const publicKey = await dispatch('getPublicKey', state.currentUserId)

  console.log('pubkey', publicKey)

  const encText = await dispatch('encryptChatMessage', {
    text,
    publicKey: publicKey
  })

  console.log(encText)

  const retMessage = await this._vm.$appFeathers.service('messages').create({
    from: state.user._id,
    to: to,
    text: encText,
    mediaId: _mediaId,
    uid: uid,
    status: 1,
    mediaType,
    createdAt: createdAt,
    updatedAt: updatedAt,
    thumb
  })

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
            localFile: r.localFile,
            mediaType: r.mediaType,
            mediaId: r.mediaId,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            uid: r._id,
            to: JSON.parse(r.toids)
          })
        })
      }
    })
  }, (e) => {
    console.log('update conv gagal', e)
  }, () => {
    // console.log('update conv success')
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
}

export function removeCurrent ({ state, commit }) {
  console.log('remove current')
  this._vm.$appFeathers.service('onlineuser').patch(null, { $pull: { subcriber: state.user._id } }, { query: { userId: state.currentUserId } })
  commit('removeCurrent')
}

export function loadMessage ({ state, commit, dispatch }, limit) {
  return new Promise((resolve, reject) => {
    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM message WHERE convid=? ORDER BY createdAt DESC Limit ? OFFSET ?', [state.currentUserId, limit, state.dataMessage.length], (tx, rs) => {
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
        console.log('total user e ', error.message)
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
    dispatch('addMessage', { ...r, status: 2 }).then(() => {
      dispatch('setReceive', r)
    })
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
          tx.executeSql('INSERT INTO contact VALUES (?,?,?,?,?,?)', [row._id, row.email, row.name, row.phone, row.country, row.publicKey])
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
    db = window.sqlitePlugin.openDatabase({ name: 'chat09' + state.user._id + '.db', location: 'default' }, function (db) {}, function (error) { console.log('Open database ERROR: ' + JSON.stringify(error)) })
    console.log('DB: SQLite')
  } else {
    db = window.openDatabase('chat09' + state.user._id, '0.1', 'My list', 200000)
    console.log('DB: WebSQL')
  }
  this._vm.$db = db
  db.transaction((tx) => {
    tx.executeSql('CREATE TABLE IF NOT EXISTS message (_id, message, convid, fromid, toids, createdAt, updatedAt ,status, recipientStatus, mediaId, mediaType, localFile, thumb)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS conv (message, convid, name, phone, unreadCount INTEGER DEFAULT 0, updatedAt)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS contact (_id, email, name, phone, country, publickey)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS setting (key, value)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS convididx ON message (convid)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS _ididx ON message (_id)')
    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS phone ON contact (phone)')
  }, (error) => {
    console.log('Transaction ERROR: ' + error.message)
  }, () => {
    console.log('create database OK')
  })
}

export async function findContactDetail ({ state, dispatch, commit }, id) {
  let c = _.find(state.contacts, c => c._id === id)
  if (!c) {
    const data = await this._vm.$appFeathers.service('users').find({ query: { _id: id } })
    c = data.data[0]
    console.log('oke banget ', c, data)
    await dispatch('insertContact', c)
    commit('insertContact', c)
  }
  return c
}

export async function addMessage ({ state, commit, dispatch }, data) {
  // console.log('saving message :', data)
  // get lawan chat
  // @todo support group chat
  let id = ''
  let recipientStatus = ''
  let dText = ''
  if (data.from === state.user._id) {
    id = data.to[0]
    recipientStatus = JSON.stringify(data.recipientStatus)
  } else {
    id = data.from
    dText = await dispatch('decryptChatMessage', {
      text: data.text,
      privateKey: state.privateKey
    })
  }

  // update conv
  // this will make list chat have last message inserted
  const contactDetail = await dispatch('findContactDetail', id)

  if (data.from !== state.user._id) {
    dispatch('updateConv', {
      message: dText,
      convid: id,
      name: contactDetail.name,
      phone: contactDetail.phone,
      updatedAt: data.createdAt
    })
  }

  // check if data with id exists
  // if own chat it will be exists with same id since save to db first then send
  // reason is to support send message while offline
  const dataExists = await dispatch('getMessageByUID', data.uid)
  const to = JSON.stringify(data.to)

  let rowId = ''
  if (dataExists) {
    // update message
    const resultUpdate = await dispatch('updateMessageStatus', {
      status: data.status,
      recipientStatus,
      uid: data.uid
    })
    rowId = dataExists.rowId
    console.log('update status by addMessage ' + data.uid, resultUpdate)
  } else {
    console.log('insert message :', data)
    const resultInsert = await dispatch('insertMessage', [data.uid, dText, id, data.from, to, data.createdAt, data.updatedAt, data.status, recipientStatus, data.mediaId, data.mediaType, '', data.thumb])
    rowId = resultInsert.insertId
  }

  // if user already in chat detail add message to list current chat
  if (id === state.currentUserId) {
    if (dataExists) {
      console.log('update message')
      commit('updateMessage', {
        // message: dText,
        // rowid: rowId,
        _id: data.uid,
        // contact: id,
        // createdAt: data.createdAt,
        // updatedAt: data.updatedAt,
        // fromid: data.from,
        status: data.status
      })
    } else {
      commit('addMessage', {
        message: dText,
        rowid: rowId,
        _id: data.uid,
        contact: id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        fromid: data.from,
        status: data.status,
        mediaId: data.mediaId,
        mediaType: data.mediaType,
        thumb: data.thumb
      })
    }

    // send chat status that already read
    if (id === state.currentUserId && data.from !== state.user._id) {
      dispatch('sendReadStatus', { uids: [data.uid], to: data.from, status: 3 })
      if (!state.appRunning && window.cordova && window.cordova.plugins && window.cordova.plugins.notification) {
        dispatch('findContactDetail', id).then((c) => {
          cordova.plugins.notification.local.schedule({
            title: c.name,
            text: dText,
            foreground: true
          })
        })
      }
    }
  } else {
    console.log('open local notif')
    if (data._source === 'socket' && window.cordova && window.cordova.plugins && window.cordova.plugins.notification) {
      dispatch('findContactDetail', id).then((c) => {
        cordova.plugins.notification.local.schedule({
          title: c.name,
          text: dText,
          foreground: true
        })
      })
    }
  }
}

export async function downloadMedia ({ state, commit, dispatch }, uid) {
  const message = await dispatch('getMessageByUID', uid)
  console.log('download media id : ', message.mediaId)
  const media = await this._vm.$appFeathers.service('media').get(message.mediaId)
  console.log('downlaod file : ', media.filename)
  console.log('downlaod file : ', this._vm.$socket.io.uri)
  const baseUrl = this._vm.$socket.io.uri

  commit('updateMessage', {
    _id: uid,
    downloading: true
  })

  if (message.mediaType === '1' || message.mediaType === 1 || message.mediaType === '2' || message.mediaType === 2 || message.mediaType === '3' || message.mediaType === 3) {
    const dir = await new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(cordova.file.externalApplicationStorageDirectory, (dirEntry) => {
        console.log(dirEntry)
        dirEntry.filesystem.root.getDirectory('MGGCHAT', {
          create: true,
          exclusive: false
        }, (dir) => {
          resolve(dir)
        }, (e) => {
          reject(e)
        })
      }, function (e) {
        reject(e)
      })
    })

    const filename = await new Promise((resolve, reject) => {
      var fileTransfer = new window.FileTransfer()
      fileTransfer.onprogress = (event) => {
        console.log('progress', event)
        commit('updateMessage', {
          _id: uid,
          loaded: event.loaded,
          total: event.total,
          percentage: event.loaded / event.total * 100
        })
      }
      fileTransfer.download(
        baseUrl + '/uploads/' + media.filename,
        dir.nativeURL + media.filename,
        (theFile) => {
          console.log(theFile)
          console.log('download complete: ' + theFile.toURL())
          resolve(theFile.toURL())
          // showLink(theFile.toURI())
        },
        (error) => {
          console.log('download error source ' + error.source)
          console.log('download error target ' + error.target)
          console.log('upload error code: ' + error.code)
          console.log(error)
          resolve(false)
        }
      )
    })
    if (filename) {
      this._vm.$appFeathers.service('media').patch(null, { $pull: { to: state.user._id } }, { query: { _id: message.mediaId } })

      console.log('localFIle', filename)
      const imgCordova = await new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(filename, (fileEntry) => {
          console.log('file entry', fileEntry)
          fileEntry.file((file) => {
            resolve(file)
          }, function (e) {
            reject(e)
          })
        }, function (e) {
          reject(e)
        })
      })
      dispatch('updateMessageLocalFile', {
        _id: uid,
        localFile: imgCordova.localURL
      })
      commit('updateMessage', {
        _id: uid,
        downloading: false,
        localFile: imgCordova.localURL
      })
    }
  }
}

// check read message on read event
export function readMessage ({ state, commit, dispatch }, data) {
  db.transaction((tx) => {
    _.forEach(data.uids, (uid) => {
      tx.executeSql('SELECT * FROM message WHERE _id = ?', [uid], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0) {
          const message = selects[0]
          var newRecipientStatus = JSON.parse(message.recipientStatus)

          var match = _.find(newRecipientStatus, { _id: data.from })
          var index = _.findIndex(newRecipientStatus, { _id: data.from })
          newRecipientStatus.splice(index, 1, { ...match, status: match.status > data.status ? match.status : data.status })

          const status = _.min(newRecipientStatus, o => o.status).status
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

export async function uploadFile ({ commit, state, rootState }, { img, type, mediaType }) {
  console.log('start uplaod ', img)
  let fileCompress = ''
  if (mediaType === '1' || mediaType === 1) {
    fileCompress = await new Promise((resolve, reject) => {
      let options = {}
      options = {
        uri: img,
        folderName: 'compressx',
        quality: 90,
        width: 600,
        height: 600,
        base64: false,
        fit: false
      }
      window.ImageResizer.resize(options,
        function (image) {
          console.log('file compress untuk upload: ', image)
          resolve(image)
        }, function (e) {
          console.log('error compress untuk upload', e)
          reject(e)
        })
    })
  } else {
    fileCompress = img
  }
  console.log('file comprese upload', img, type)
  return await new Promise((resolve, reject) => {
    var fd = new FormData()
    window.resolveLocalFileSystemURL(fileCompress, (fileEntry) => {
      console.log('file entry', fileEntry)
      fileEntry.file((file) => {
        console.log(file)
        var reader = new FileReader()
        var axios = this._vm.$chatAxios
        reader.onloadend = function (e) {
          var imgBlob = new Blob([this.result], { type: type })
          fd.append('file', imgBlob)
          console.log(fd, this.result)

          axios.post('/uploads', fd, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }).then(retAxios => {
            console.log('sukses upload', retAxios)
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
