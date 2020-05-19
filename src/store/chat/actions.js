/*
export function someAction (context) {
}
*/
var _ = require('lodash')
var db = null
import { LocalStorage } from 'quasar'
import { jwtDecode } from 'jwt-js-decode'

// signup action
export async function doSignup ({ state }, { email, password, nameId, country, phoneNumber }) {
  return this._vm.$appFeathers.service('users').create({
    email,
    password,
    nameId,
    phoneNumber,
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
  await dispatch('openDB')
  await dispatch('loadKey')
  await dispatch('loadLocalContact')
  await dispatch('loadConv')
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
    phoneNumber: decode.payload.phoneNumber
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
        forceShow: 'true'
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

export async function sendChat ({ state, dispatch, getters }, { text, localFile, uid, to, mediaType, mediaId, createdAt, updatedAt, groupId, convid }) {
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
  let publicKey = ''
  console.log(groupId, convid)
  if (groupId) {
    publicKey = await dispatch('getGroupPublicKey', convid)
  } else {
    publicKey = await dispatch('getPublicKey', convid)
  }

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
    groupId: groupId,
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
            convid: r.convid,
            localFile: r.localFile,
            mediaType: r.mediaType,
            mediaId: r.mediaId,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            uid: r._id,
            groupId: r.groupId,
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

export async function setReceive ({ state }, id) {
  console.log('id', id)
  console.log('pull', state.user._id)
  const m = await this._vm.$appFeathers.service('messages').patch(null, { $pull: { to: state.user._id } }, { query: { _id: id._id } })
  // const m = await this._vm.$appFeathers.service('messages').patch(null, { to: to }, { query: { _id: id } })
  console.log('m', m)
  if (m[0].to.length === 0) {
    console.log('remove', id._id)
    await this._vm.$appFeathers.service('messages').remove(id._id)
  }
}

export async function sendReadStatus ({ state }, { uids, to, status }) {
  console.log('send read status : ', uids, to, status)
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
  await dispatch('syncGroup')
  const deleteMessage = await dispatch('getUnsentDeleteMessage')
  console.log('message to delete', deleteMessage)
  _.forEach(deleteMessage, async message => {
    const to = JSON.parse(message.toids)
    if (to.length > 0) {
      await this._vm.$appFeathers.service('readevent').create({
        uids: [message._id],
        to: to[0],
        from: state.user._id,
        status: 5
      })
      await dispatch('deleteMessageStatus', {
        status: 5,
        uid: message._id
      })
      // this._vm.$appFeathers.service('messages').remove(r._id)
    }
  })

  const data = await this._vm.$appFeathers.service('messages').find({ query: { $limit: 1000, $sort: { createdAt: 1 }, to: { $in: [state.user._id] } } })
  console.log('new chat total', data.data.length)
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

  for (let index = 0; index < data.data.length; index++) {
    const r = data.data[index]
    try {
      console.log('addmessage 1', r)
      await dispatch('addMessage', { ...r, status: 2 })
      console.log('addmessage 2')
      dispatch('setReceive', r)
    } catch (error) {
      console.log('add message error', error)
    }
  }

  const dataReadEvents = await this._vm.$appFeathers.service('readevent').find({ query: { $limit: 99999, $sort: { createdAt: 1 }, to: state.user._id } })
  _.forEach(dataReadEvents.data, (r) => {
    dispatch('readMessage', r)
    this._vm.$appFeathers.service('readevent').remove(r._id)
  })

  return true
}

export async function syncGroup ({ state, commit, dispatch }) {
  const data = await this._vm.$appFeathers.service('group').find({ query: { $limit: 1000, $sort: { createdAt: 1 }, members: { $in: [state.user._id] } } })
  console.log('list group', data.data.length)

  for (let index = 0; index < data.data.length; index++) {
    const r = data.data[index]
    try {
      const c = _.find(state.convs, (e) => e.convid === r._id)
      if (!c) {
        dispatch('newGroup', r)
      }
    } catch (error) {
      console.log('add message error', error)
    }
  }
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

  console.log('%c-user', 'color: blue;', state.user.phoneNumber)
  const index = phoneNumbers.indexOf(state.user.phoneNumber)
  if (index > -1) {
    phoneNumbers.splice(index, 1)
  }

  const chunkphoneNumbers = _.chunk(phoneNumbers, 30)
  let contacts = []
  for (const chunkphoneNumber of chunkphoneNumbers) {
    // const c = await this._vm.$chatAxios.get('/users', {
    //   phoneNumbers: chunkphoneNumber
    // })
    const c = await this._vm.$appFeathers.service('users').find({ query: { $limit: 99999, phoneNumber: chunkphoneNumber } })
    console.log(c)
    const usersFound = c.data
    contacts = [...contacts, ...usersFound]
  }

  console.log('hasil contact', contacts)

  return await new Promise((resolve, reject) => {
    // console.log(phoneNumbers)
    console.log('%c-contacts', 'color: blue;', JSON.stringify(contacts))

    db.transaction((tx) => {
      tx.executeSql('DELETE FROM contact', [])
      _.forEach(contacts, (row) => {
        tx.executeSql('INSERT INTO contact VALUES (?,?,?,?,?,?,?)', [row._id, row.email, row.nameId, row.phoneNumber, row.country, row.publicKey, row.imgProfile])
      })
    }, function (error) {
      console.log('Transaction ERROR: ' + error.message)
      reject(error)
    }, function () {
      resolve(true)
    })
  })
}

export function openDB ({ state }) {
  console.log(window.sqlitePlugin)
  if (window.sqlitePlugin) {
    db = window.sqlitePlugin.openDatabase({ name: 'chat12' + state.user._id + '.db', location: 'default' }, function (db) {}, function (error) { console.log('Open database ERROR: ' + JSON.stringify(error)) })
    console.log('DB: SQLite')
  } else {
    db = window.openDatabase('chat12' + state.user._id, '0.1', 'My list', 200000)
    console.log('DB: WebSQL')
  }
  this._vm.$db = db
  db.transaction((tx) => {
    tx.executeSql('CREATE TABLE IF NOT EXISTS message (_id, message, convid, fromid, toids, createdAt, updatedAt ,status, recipientStatus, mediaId, mediaType, localFile, thumb, groupId)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS conv (message, convid, name, phoneNumber, unreadCount INTEGER DEFAULT 0, updatedAt, imgProfile, isGroup, members, publicKey, privateKey)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS contact (_id, email, name, phoneNumber, country, publickey, imgProfile)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS setting (key, value)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS convididx ON message (convid)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS _ididx ON message (_id)')
    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS phoneNumber ON contact (phoneNumber)')
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
    const key = await this._vm.$appFeathers.service('userkeys').find({ query: { userId: data._id } })
    c = data.data[0]
    c.publicKey = key.publicKey
    c.name = c.nameId
    console.log('oke banget ', c, data)
    await dispatch('insertContact', c)
    commit('insertContact', c)
  }
  return c
}

export async function createGroup ({ state, dispatch, commit }, data) {
  return await this._vm.$appFeathers.service('group').create({
    name: data.name,
    image: data.image,
    members: [..._.map(state.selectedCreateGroup, (u) => {
      return u._id
    }), state.user._id]
  })
}

export async function newGroup ({ state, dispatch, commit }, group) {
  await dispatch('updateConv', {
    message: '',
    convid: group._id,
    name: group.name,
    phoneNumber: '',
    updatedAt: group.updatedAt,
    imgProfile: group.image,
    isGroup: true,
    members: group.members,
    publicKey: group.publicKey,
    privateKey: group.privateKey
  })
  await dispatch('updateConvToZero', group._id)
}

export async function addMessage ({ state, commit, dispatch }, data) {
  console.log('saving message :', data)
  // get lawan chat
  console.log('addMessage mulai', data)

  let id = ''
  let recipientStatus = ''
  let dText = ''

  console.log('contactDetail', data)

  if (data.from === state.user._id) {
    console.log('addMessage sama')
    if (data.groupId) {
      id = data.groupId
    } else {
      id = data.to[0]
    }
    recipientStatus = JSON.stringify(data.recipientStatus)
  } else {
    console.log('decryptChatMessage mulai')
    id = data.from
    let pvkey = ''
    if (data.groupId) {
      id = data.groupId
      pvkey = await dispatch('getGroupPrivateKey', data.groupId)
    } else {
      pvkey = state.privateKey
    }
    dText = await dispatch('decryptChatMessage', {
      text: data.text,
      privateKey: pvkey
    })
  }
  console.log('decryptChatMessage done')

  // update conv
  // this will make list chat have last message inserted
  let contactDetail = {}
  if (data.groupId) {
    // id = data.groupId
    contactDetail = await dispatch('getGroupData', id)
  } else {
    contactDetail = await dispatch('findContactDetail', id)
  }
  console.log('contactDetail', contactDetail)

  if (data.from !== state.user._id) {
    dispatch('updateConv', {
      message: dText,
      convid: id,
      name: contactDetail.name,
      phoneNumber: '',
      updatedAt: data.createdAt,
      imgProfile: data.imgProfile
    })
  }
  console.log('update conv done')

  // check if data with id exists
  // if own chat it will be exists with same id since save to db first then send
  // reason is to support send message while offline
  const dataExists = await dispatch('getMessageByUID', data.uid)
  const to = JSON.stringify(data.to)
  console.log('check done')

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
    const resultInsert = await dispatch('insertMessage', [data.uid, dText, id, data.from, to, data.createdAt, data.updatedAt, data.status, recipientStatus, data.mediaId, data.mediaType, '', data.thumb, data.groupId])
    rowId = resultInsert.insertId
  }
  // belum selesai untuk group
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
      console.log('add message data', data)
      commit('addMessage', {
        message: dText,
        rowid: rowId,
        _id: data.uid,
        groupId: data.groupId,
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

export async function switchSelected ({ commit }, uid) {
  commit('switchSelected', {
    _id: uid
    // selected: true
  })
}

export async function deleteSelected ({ commit, state, dispatch }, deleteMeOnly) {
  const list = _.filter(state.dataMessage, { selected: true })

  for (let index = 0; index < list.length; index++) {
    let status = 5
    const message = list[index]
    if (message.fromid === state.user._id) {
      if (deleteMeOnly) {
        console.log('delete langsung hapus ', message)
        await dispatch('deleteMessageStatus', {
          status: status,
          uid: message._id
        })
      } else {
        console.log('delete with status 4 ajakne')
        status = 4
        await dispatch('deleteMessageStatus', {
          status: status,
          uid: message._id
        })
      }
    } else {
      await dispatch('deleteMessageStatus', {
        status: status,
        uid: message._id
      })
    }
    commit('updateMessage', { ...message, status: status })
  }
  dispatch('syncChat')
}

export async function downloadMedia ({ state, commit, dispatch }, uid) {
  const message = await dispatch('getMessageByUID', uid)
  console.log('download media id : ', message.mediaId)
  const media = await this._vm.$appFeathers.service('media').get(message.mediaId)
  console.log('downlaod file : ', media.filename)
  console.log('downlaod file : ', this._vm.$socket.io.uri)
  const baseUrl = 'http://192.168.1.102:3000'

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
  console.log('readevent', data)
  if (data.status === 5 || data.status === '5') {
    _.forEach(data.uids, (uid) => {
      dispatch('deleteMessageStatus', {
        status: 5,
        uid: uid
      })
      // if (state.currentUserId === data.from) {
      commit('updateMessage', { _id: uid, status: 5 })
      // }
    })
  } else {
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

            const status = _.minBy(newRecipientStatus, o => o.status).status
            console.log('status', status, newRecipientStatus)
            tx.executeSql('UPDATE message SET status = ?, recipientStatus = ? WHERE _id = ?', [status, JSON.stringify(newRecipientStatus), uid], (tx, messageResult) => {
              // if (state.currentUserId === data.from) {
              commit('updateMessage', { ...message, recipientStatus: newRecipientStatus, status: status })
              // }
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
}

export function setReadCurrentChat ({ state, commit, dispatch }, data) {
  return new Promise((resolve, reject) => {
    // console.log('setReadCurrentChat 1')
    db.transaction(function (tx) {
      console.log('setReadCurrentChat 2')
      tx.executeSql('SELECT * FROM message WHERE convid=? and status=? and fromid<>? ORDER BY createdAt', [state.currentUserId, 2, state.user._id], (tx, rs) => {
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
