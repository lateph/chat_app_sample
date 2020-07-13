/*
export function someAction (context) {
}
*/
var _ = require('lodash')
var db = null
import { LocalStorage } from 'quasar'
const bson = require('bson')
import { jwtDecode } from 'jwt-js-decode'
var falsy = /^(?:f(?:alse)?|no?|0+)$/i
Boolean.parse = function (val) {
  return !falsy.test(val) && !!val
}
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
  message.user.name = message.user.nameId
  dispatch('setSetting', {
    key: 'user',
    value: JSON.stringify(message.user)
  })
  await dispatch('loadKey')
  dispatch('updateToken', message.user._id)
  try {
    await dispatch('loadLocalContact')
  } catch (error) {
  }
  await dispatch('loadConv')
  dispatch('sendPendingChat')
  await dispatch('syncGroup')
  dispatch('syncChat')

  LocalStorage.set('jwt', message.accessToken)
  return message
}

export async function doLoginJwt ({ state, dispatch, commit }, { jwt }) {
  const message = await this._vm.$appFeathers.service('authentication').create({
    accessToken: jwt,
    strategy: 'jwt'
  })
  LocalStorage.set('jwt', message.accessToken)
  commit('user', message.user)

  await dispatch('openDB')
  message.user.name = message.user.nameId
  dispatch('setSetting', {
    key: 'user',
    value: JSON.stringify(message.user)
  })
  await dispatch('loadKey')
  await dispatch('loadLocalContact')
  await dispatch('loadConv')
  await dispatch('syncGroup')
  dispatch('syncChat')
  dispatch('updateToken', message.user._id)
  LocalStorage.set('jwt', message.accessToken)
  return message
}

export async function localDataLoad ({ state, dispatch, commit }, { jwt }) {
  const decode = jwtDecode(jwt)

  commit('user', {
    _id: decode.payload.sub
  })
  dispatch('openDB')

  const user = await dispatch('getSetting', {
    key: 'user'
  })
  commit('user', JSON.parse(user))
  console.log('user decodde', decode)
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

export async function sendChat ({ state, dispatch, getters }, { text, localFile, uid, to, mediaType, mediaId, createdAt, updatedAt, groupId, convid, params }) {
  let _mediaId = ''
  let thumb = ''
  let aesKey = ''
  let iv = ''

  console.log(groupId, convid)
  if (groupId) {
    ({ aesKey, iv } = await dispatch('getGroupKey', convid))
  } else {
    ({ aesKey, iv } = await dispatch('getContactKey', convid))
  }
  if (mediaType === 1 || mediaType === '1') {
    const mediaDetail = JSON.parse(mediaId)
    const ret = await dispatch('uploadFile', { img: mediaDetail.file, type: mediaDetail.type, mediaType, aesKey, iv })
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
    const ret = await dispatch('uploadFile', { img: mediaDetail.file, type: mediaDetail.type, mediaType, aesKey, iv })
    _mediaId = ret.data._id
    thumb = JSON.stringify({
      type: mediaDetail.mediaType,
      name: mediaDetail.name
    })
  }

  // const encText = await dispatch('encryptChatMessage', {
  //   text,
  //   publicKey: publicKey
  // })

  const encText = await dispatch('encryptAes', {
    text,
    aesKey,
    iv
  })

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
    thumb,
    params
  })

  return retMessage
}

export async function sendPendingChat ({ dispatch }) {
  db.transaction((tx) => {
    tx.executeSql('select message.*, conv.isBroadcast, conv.isGroup from message left join conv on message.convid = conv.convid WHERE message.status = ?', [0], (tx, messageResult) => {
      let selects = messageResult.rows._array
      if (!selects) {
        selects = messageResult.rows
      }
      if (selects.length > 0) {
        _.forEach(selects, (r) => {
          if (r.isBroadcast) {
            return
          }
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
            params: r.params,
            isGroup: Boolean.parse(r.isGroup),
            isBroadcast: Boolean.parse(r.isBroadcast),
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
  // check group
  try {
    console.log('start check group')
    const fg = await this._vm.$appFeathers.service('group').get(data)
    console.log('start check group', fg)
    await dispatch('newGroup', fg)
  } catch (error) {
    console.log('start check group', error)
  }

  commit('setCurrent', data)
  // console.log('list group', data.data.length)

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
      const offset = state.dataMessage.length - _.filter(state.dataMessage, (o) => String(o.mediaType) === '12').length
      tx.executeSql('SELECT * FROM message WHERE convid=? ORDER BY createdAt DESC Limit ? OFFSET ?', [state.currentUserId, limit, offset], (tx, rs) => {
        let selects = rs.rows._array
        if (!selects) {
          selects = rs.rows
        }
        if (selects.length > 0) {
          dispatch('insertMessages', [...selects].reverse())
          resolve(selects)
        } else {
          console.log('empty user')
          reject('loadMessage empty')
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
  const deleteMessage = await dispatch('getUnsentDeleteMessage')
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
  // console.log('new chat total', data.data.length)
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
      // console.log('addmessage 2')
      dispatch('setReceive', r)
    } catch (error) {
      dispatch('setReceive', r)
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
  // console.log('list group', data.data.length)

  for (let index = 0; index < data.data.length; index++) {
    const r = data.data[index]
    try {
      const c = _.find(state.convs, (e) => e.convid === r._id)
      if (!c) {
        await dispatch('newGroup', r)
      } else {
        if (JSON.stringify(r.members) !== c.members || JSON.stringify(r.admins) !== c.admins) {
          await dispatch('newGroup', r)
        }
      }
    } catch (error) {
      console.log('add message error', error)
    }
  }
  return true
}

export async function syncUpdate ({ state, commit, dispatch }) {
  const data = await this._vm.$appFeathers.service('update').find({ query: { $limit: 1000, $sort: { createdAt: 1 }, tos: { $in: [state.user._id] } } })
  console.log('list update', data.data.length)
  for (let index = 0; index < data.data.length; index++) {
    const r = data.data[index]
    try {
      await dispatch('prosesUpdate', r)
    } catch (error) {
      console.log('add message error', error)
    }
  }
  return true
}

export async function prosesUpdate ({ state, commit, dispatch }, r) {
  if (r.type === 'left_group' || r.type === 'remove_from_group') {
    const params = JSON.parse(r.params)
    const data = await this._vm.$appFeathers.service('group').get(params.groupId)
    console.log('update group', data)
    await dispatch('newGroup', data)
  }
  const nr = await this._vm.$appFeathers.service('update').patch(null, { $pull: { tos: state.user._id } }, { query: { _id: r._id } })
  if (nr.length > 0 && nr[0].tos.length === 0) {
    this._vm.$appFeathers.service('update').remove(nr[0]._id)
  }
}

/*
  rereive all contact from phone
  save contact to db
*/
export async function syncContact ({ state, commit, dispatch }) {
  console.log('state', state)
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
  for (let j = 0; j < contacts.length; j++) {
    const element = contacts[j]
    console.log('try insert', element)
    if (element.publicKey && element.aesKey && element.iv) {
      console.log('insert contanct', element)
      await dispatch('insertContact', element)
    }
  }
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
    tx.executeSql('CREATE TABLE IF NOT EXISTS message (_id, message, convid, fromid, toids, createdAt, updatedAt ,status INTEGER, recipientStatus, mediaId, mediaType INTEGER, localFile, thumb, groupId, params, broadcastId)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS conv (message, convid, name, phoneNumber, unreadCount INTEGER DEFAULT 0, updatedAt, imgProfile, isGroup, isBroadcast, members, admins, publicKey, privateKey, aesKey, iv, params)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS contact (_id, email, name, phoneNumber, country, publickey, aesKey, iv, imgProfile)')
    tx.executeSql('CREATE TABLE IF NOT EXISTS setting (key, value)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS convididx ON message (convid)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS broadcastIdx ON message (broadcastId)')
    tx.executeSql('CREATE INDEX IF NOT EXISTS _ididx ON message (_id)')
    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS _idc ON contact (_id)')
  }, (error) => {
    console.log('Transaction ERROR: ' + error.message)
  }, () => {
    // console.log('create database OK')
  })
}

export async function findContactDetail ({ state, dispatch, commit }, id) {
  let c = _.find(state.contacts, c => c._id === id)
  if (!c) {
    console.log('not fond ?', id)
    const data = await this._vm.$appFeathers.service('users').find({ query: { _id: id } })
    console.log('not fond ?', data, id)
    const key = await this._vm.$appFeathers.service('userkey').find({ query: { userId: data.data[0]._id } })
    c = data.data[0]
    c.publicKey = key.publicKey || key.data[0].publicKey
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
    createdBy: state.user._id,
    admins: [state.user._id],
    members: [..._.map(state.selectedCreateGroup, (u) => {
      return u._id
    }), state.user._id]
  })
}

export async function addGroupMember ({ state, dispatch, commit }, { _id, members }) {
  return await this._vm.$appFeathers.service('group').patch(null, { $push: { members: { $each: members } } }, { query: { _id: _id } })
}

export async function leftGroup ({ state, dispatch, commit }, { _id }) {
  // add custom message
  const group = await this._vm.$appFeathers.service('group').patch(null, { $pull: { members: state.user._id, admins: state.user._id } }, { query: { _id: _id } })
  await this._vm.$appFeathers.service('update').create({
    from: state.user._id,
    tos: [state.user._id],
    type: 'left_group',
    params: JSON.stringify({
      groupId: _id
    })
  })
  if (group.length > 0 && group[0].members.length > 0 && group[0].admins.length === 0) {
    const contact = await dispatch('findContactDetail', group[0].members[0])
    dispatch('addAdminGroup', {
      _id: _id,
      member: group[0].members[0],
      contact: contact
    })
  }
  console.log('new group', group)
}

export async function removeMemberGroup ({ state, dispatch, commit }, { _id, member }) {
  // add custom message
  await this._vm.$appFeathers.service('update').create({
    from: state.user._id,
    tos: [member],
    type: 'remove_from_group',
    params: JSON.stringify({
      groupId: _id
    })
  })
  return await this._vm.$appFeathers.service('group').patch(null, { $pull: { members: member } }, { query: { _id: _id } })
}

export async function addAdminGroup ({ state, dispatch, commit }, { _id, member, contact }) {
  // add custom message
  await this._vm.$appFeathers.service('group').patch(null, { $push: { admins: member } }, { query: { _id: _id } })
  await dispatch('saveChat', {
    text: JSON.stringify({
      code: 'add_admin_group',
      userId: state.user._id,
      userName: state.user.name,
      targetUserId: contact._id,
      targetUserName: contact.name
    }),
    mediaType: 11,
    mediaId: '',
    localFile: ''
  })
  dispatch('sendPendingChat')
}

export async function removeAdminGroup ({ state, dispatch, commit }, { _id, member, contact }) {
  // add custom message
  await this._vm.$appFeathers.service('group').patch(null, { $pull: { admins: member } }, { query: { _id: _id } })
  await dispatch('saveChat', {
    text: JSON.stringify({
      code: 'remove_admin_group',
      userId: state.user._id,
      userName: state.user.name,
      targetUserId: contact._id,
      targetUserName: contact.name
    }),
    mediaType: 11,
    mediaId: '',
    localFile: ''
  })
  dispatch('sendPendingChat')
}

export async function newGroup ({ state, dispatch, commit }, group) {
  for (let index = 0; index < group.members.length; index++) {
    const element = group.members[index]
    try {
      await dispatch('findContactDetail', element)
    } catch (error) {
      console.log(error)
    }
  }
  let createdByName = ''
  if (group.createdBy) {
    try {
      const _contact = await dispatch('findContactDetail', group.createdBy)
      createdByName = _contact.name
    } catch (error) {
    }
  }
  let aesKey = ''
  let iv = ''
  if (group.aesKey) {
    aesKey = await dispatch('decryptChatMessage', {
      text: group.aesKey,
      privateKey: state.privateKey
    })
  }
  if (group.iv) {
    iv = await dispatch('decryptChatMessage', {
      text: group.iv,
      privateKey: state.privateKey
    })
  }
  await dispatch('updateConv', {
    message: '',
    convid: group._id,
    name: group.name,
    phoneNumber: '',
    updatedAt: group.updatedAt,
    imgProfile: group.image,
    isGroup: true,
    members: group.members,
    admins: group.admins,
    publicKey: group.publicKey,
    privateKey: group.privateKey,
    unreadCount: 0,
    createdAt: group.createdAt,
    createdBy: group.createdBy,
    createdByName,
    aesKey,
    iv
  })
  // await dispatch('updateConvToZero', group._id)
}

export async function addMessage ({ state, commit, dispatch }, data) {
  // console.log('saving message :', data)
  // get lawan chat
  // console.log('addMessage mulai', data)

  let id = ''
  let recipientStatus = ''
  let dText = ''

  // console.log('contactDetail', data)

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
    let aesKey = ''
    let iv = ''
    if (data.groupId) {
      id = data.groupId
      try {
        ({ aesKey, iv } = await dispatch('getGroupKey', data.groupId))
      } catch (error) {
        console.log('pvkey is error ', error)
        dispatch('syncGroup')
      }
    } else {
      // pvkey = state.privateKey
      aesKey = state.aesKey
      iv = state.iv
    }
    dText = await dispatch('decryptAes', {
      text: data.text,
      aesKey: aesKey,
      iv: iv
    })
  }
  console.log('decryptChatMessage done')

  const fromContact = await dispatch('findContactDetail', data.from)
  // update conv
  // this will make list chat have last message inserted
  let contactDetail = {}
  if (data.groupId) {
    // id = data.groupId
    contactDetail = await dispatch('getGroupData', id)
  } else {
    contactDetail = fromContact
  }
  console.log('contactDetail', contactDetail)

  const mediaType = String(data.mediaType)
  if (data.from !== state.user._id && mediaType !== '11') {
    console.log('try update')
    let cText = dText
    if (!cText) {
      if (mediaType === '1') {
        cText = fromContact.name + ' send a photo'
      } else if (mediaType === '2') {
        cText = fromContact.name + ' send a file'
      } else if (mediaType === '3') {
        cText = fromContact.name + ' send an audio'
      }
    }
    console.log('try update', cText)
    dispatch('updateConv', {
      message: cText,
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
  console.log('check done', dataExists)

  let rowId = ''
  if (dataExists) {
    // update message
    const resultUpdate = await dispatch('updateMessageStatus', {
      status: data.status,
      recipientStatus,
      uid: data.uid
    })
    if (dataExists.broadcastId) {
      // harse update readevent
      _.each(data.recipientStatus, (e) => {
        dispatch('readMessage', {
          // status: data.status,
          // recipientStatus,
          // uid: data.uid
          // createdAt: "2020-06-16T04:55:21.154Z"
          from: e._id,
          status: data.status,
          // to: "5ec228aaf74c57667e1d5aa3"
          uids: [dataExists.broadcastId]
          // updatedAt: "2020-06-16T04:55:21.154Z"
        })
      })
    }
    rowId = dataExists.rowId
    console.log('update status by addMessage ' + data.uid, resultUpdate)
  } else {
    console.log('insert message :', data)
    const resultInsert = await dispatch('insertMessage', [data.uid, dText, id, data.from, to, data.createdAt, data.updatedAt, 2, recipientStatus, data.mediaId, data.mediaType, '', data.thumb, data.groupId, data.params, ''])
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
      commit('notifAddMessage')
      dispatch('addMessageToList', {
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
        thumb: data.thumb,
        params: data.params
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

export async function forwardSelected ({ commit, state, dispatch }, { listTarget }) {
  console.log(this.$refs)
  const params = {
    isForward: true
  }
  try {
    const list = _.filter(state.dataMessage, { selected: true })
    for (let j = 0; j < list.length; j++) {
      const message = list[j]
      console.log('detail pesan', message)
      for (let i = 0; i < listTarget.length; i++) {
        const element = listTarget[i]
        const mt = String(message.mediaType)
        if (mt === '0') {
          try {
            await dispatch('saveChat2', {
              text: message.message,
              mediaType: 0,
              mediaId: '',
              localFile: '',
              params,
              convid: element._id
            })
          } catch (error) {
            console.log('fail forward', error)
          }
        } else if (mt === '1' || mt === '2' || mt === '3') {
          try {
            const { file, fileEntry } = await new Promise((resolve, reject) => {
              window.resolveLocalFileSystemURL(message.localFile, (fileEntry) => {
                console.log('file entry', fileEntry)
                fileEntry.file((file) => {
                  resolve({
                    file,
                    fileEntry
                  })
                }, function (e) {
                  reject(e)
                })
              }, function (e) {
                reject(e)
              })
            })
            console.log('fileCordova', file, fileEntry)
            await dispatch('saveChat2', {
              text: '',
              mediaType: parseInt(mt),
              mediaId: JSON.stringify({
                file: fileEntry.nativeURL,
                type: file.type,
                name: file.name
              }),
              localFile: fileEntry.nativeURL,
              params,
              convid: element._id
            })
          } catch (error) {
            console.log('error forward file', error)
          }
        }
      }
    }
    console.log(listTarget)
  } catch (error) {
    console.log('forward cancle')
  }
}

export async function downloadMedia ({ state, commit, dispatch }, uid) {
  const message = await dispatch('getMessageByUID', uid)
  console.log('download media id : ', message)
  const media = await this._vm.$appFeathers.service('media').get(message.mediaId)
  console.log('downlaod file : ', media.filename)
  console.log('downlaod file : ', this._vm.$socket.io.uri)
  const baseUrl = 'https://jpdigi-ppayapi-sit.rintis.co.id/chat'

  commit('updateMessage', {
    _id: uid,
    downloading: true
  })
  // download
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

    let filename = await new Promise((resolve, reject) => {
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
        // dir.nativeURL + media.originalFilename,
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
    console.log('media laoded', media)
    console.log('media', filename)

    let aesKey = ''
    let iv = ''
    if (message.groupId) {
      ({ aesKey, iv } = await dispatch('getGroupKey', message.groupId))
    } else {
      aesKey = state.aesKey
      iv = state.iv
    }
    // check encrypt
    // if (media.key) {
    //   console.log('decryptChatMessage mulai')
    //   let pvkey = ''
    //   if (message.groupId) {
    //     pvkey = await dispatch('getGroupPrivateKey', message.groupId)
    //   } else {
    //     pvkey = state.privateKey
    //   }
    //   const dText = await dispatch('decryptChatMessage', {
    //     text: media.key,
    //     privateKey: pvkey
    //   })
    //   console.log('key found mulai', dText)
    //   filename = await new Promise((resolve, reject) => {
    //     window.FileEncryption.decrypt(filename, dText, media._id + media.originalFilename, (e) => {
    //       window.resolveLocalFileSystemURL('file://' + filename, (fileEntry) => {
    //         console.log('file entry', fileEntry)
    //         fileEntry.remove(function (file) {
    //           console.log('file removed!')
    //         }, function (error) {
    //           console.log('error occurred: ' + error.code)
    //         }, function () {
    //           console.log('file does not exist')
    //         })
    //       })
    //       resolve(e)
    //       console.log('success encrypt', e)
    //     }, (e) => {
    //       reject(e)
    //       console.log('error encrypt', e)
    //     })
    //   })
    // }

    // read content
    console.log('key', aesKey, iv)
    const arrayBufferEnc = await new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(filename, (fileEntry) => {
        console.log('file entry', fileEntry)
        fileEntry.file((file) => {
          var reader = new FileReader()
          reader.onloadend = function (e) {
            fileEntry.remove(function (file) {
              console.log('file removed!')
            }, function (error) {
              console.log('error occurred: ' + error.code)
            }, function () {
              console.log('file does not exist')
            })
            resolve(this.result)
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
    console.log('arrayBufferEnc', arrayBufferEnc)

    const arrayBuffer = await dispatch('decryptAesBuffer', {
      arrayBuffer: arrayBufferEnc,
      aesKey: aesKey,
      iv: iv
    })
    console.log('arrayBuffer', arrayBuffer)

    filename = await new Promise((resolve, reject) => {
      dir.getFile(media._id + media.originalFilename, { create: true, exclusive: false }, function (fileEntry) {
        console.log('fileEntry is file?' + fileEntry.isFile.toString())
        // fileEntry.name == 'someFile.txt'
        // fileEntry.fullPath == '/someFile.txt'
        fileEntry.createWriter(function (fileWriter) {
          fileWriter.onwriteend = function () {
            resolve(fileEntry)
          }
          fileWriter.onerror = function (e) {
            console.log('Failed file write: ' + e.toString())
            reject(e)
          }
          fileWriter.write(new Blob([arrayBuffer]))
        })
      }, function (e) {
        reject(e)
      })
    })

    console.log('file write complete')

    if (filename) {
      console.log('localFIle', filename)
      const appF = this._vm.$appFeathers
      var axios = this._vm.$chatAxios
      const imgCordova = await new Promise((resolve, reject) => {
        filename.file((file) => {
          appF.service('media').patch(null, { $pull: { to: state.user._id } }, { query: { _id: message.mediaId } }).then((mr) => {
            console.log('should be check to delete media and file', mr)
            if (mr.length > 0 && mr[0].to.length === 0) {
              appF.service('media').remove(message.mediaId)
              axios.delete('https://jpdigi-ppayapi-sit.rintis.co.id/chat/uploads/' + media.filename).then((file) => {
                console.log('file deleted')
              })
            }
          })
          resolve(file)
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
        tx.executeSql('SELECT rowid, * FROM message WHERE _id = ?', [uid], (tx, messageResult) => {
          let selects = messageResult.rows._array
          if (!selects) {
            selects = messageResult.rows
          }
          if (selects.length > 0) {
            const message = selects[0]
            console.log('message to update', message)
            try {
              if (message.broadcastId) {
                console.log('read message braodcastid', message)
                dispatch('readMessage', {
                  // status: data.status,
                  // recipientStatus,
                  // uid: data.uid
                  // createdAt: "2020-06-16T04:55:21.154Z"
                  from: data.from,
                  status: data.status,
                  // to: "5ec228aaf74c57667e1d5aa3"
                  uids: [message.broadcastId]
                  // updatedAt: "2020-06-16T04:55:21.154Z"
                })
              }
            } catch (error) {
              console.log(error)
            }
            console.log('jancok ile', message)
            var newRecipientStatus = []
            try {
              newRecipientStatus = JSON.parse(message.recipientStatus)
            } catch (error) {
            }
            let status = 3
            if (newRecipientStatus.length > 0) {
              var match = _.find(newRecipientStatus, { _id: data.from })
              if (match) {
                var index = _.findIndex(newRecipientStatus, { _id: data.from })
                newRecipientStatus.splice(index, 1, { ...match, status: match.status > data.status ? match.status : data.status })
              }
              const filter = _.filter(newRecipientStatus, (e) => {
                return e.status !== 6
              })
              if (filter.length > 0) {
                status = _.minBy(filter, o => o.status).status
              } else {
                status = 3
              }
            } else {
              status = 3
            }
            if (message.status === 4 || message.status === 5) {
              status = message.status
            }
            tx.executeSql('UPDATE message SET status = ?, recipientStatus = ? WHERE _id = ?', [status, JSON.stringify(newRecipientStatus), uid], (tx, messageResult) => {
              // if (state.currentUserId === data.from) {
              commit('updateMessage', { _id: uid, recipientStatus: newRecipientStatus, status: status })
              // }
            })
            if (status === 3) {
              console.log('try to update all to', status, message.createdAt)
              tx.executeSql('UPDATE message SET status = ? WHERE status < ? and convid = ? and rowid < ?', [status, status, message.convid, message.rowid], (tx, messageResult) => {
                console.log('upddate laine', messageResult.rowsAffected)
                if (messageResult.rowsAffected > 0) {
                  console.log('call mutation')
                  commit('updateMessageToSucces', message)
                }
                // if (state.currentUserId === data.from) {
                // commit('updateMessage', { _id: uid, recipientStatus: newRecipientStatus, status: status })
                // }
              })
            }
          }
        })
      })
    }, (error) => {
      console.log('Transaction ERROR: ' + error.message)
    }, () => {
      console.log('message status saved OK')
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
              }).then(() => {
                db.transaction(function (tx) {
                  tx.executeSql('UPDATE message SET status = 3 WHERE convid=? and status=2 and fromid!=?', [state.currentUserId, state.user._id], (tx, rs) => {
                    console.log('update selesai2')
                  })
                }, function (tx, error) {
                  console.log('update status ', tx, error)
                })
              })
              console.log('update selesai1')
            }
          })
          resolve(true)
        } else {
          reject('setReadCurrentChat fail')
        }
      }, function (tx, error) {
        console.log('total user e ', error)
        reject(error)
      })
    })
  })
}

export async function uploadFile ({ commit, state, rootState, dispatch }, { img, type, mediaType, aesKey, iv }) {
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
  // console.log('create dir for encripsi ok', dir)
  // encrypt file
  const cpFile = await new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(fileCompress, (fileEntry) => {
      console.log('file entry', fileEntry)
      fileEntry.file((file) => {
        var reader = new FileReader()
        reader.onloadend = function (e) {
          resolve({
            fileEntry,
            arrayBuffer: this.result
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

  console.log('cpFile', cpFile)

  const encArrayBuffer = await dispatch('encryptAesArrayBuffer', {
    arrayBuffer: cpFile.arrayBuffer,
    aesKey,
    iv
  })

  console.log('encArrayBuffer', encArrayBuffer)

  const app = this._vm.$appFeathers
  return await new Promise((resolve, reject) => {
    var fd = new FormData()
    var axios = this._vm.$chatAxios
    var imgBlob = new Blob([encArrayBuffer], { type: 'application/octet-stream' })
    fd.append('file', imgBlob)
    console.log(fd, encArrayBuffer)
    axios.post('https://jpdigi-ppayapi-sit.rintis.co.id/chat/uploads', fd, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(retAxios => {
      const dataUpload = retAxios.data
      console.log('sukses upload', dataUpload)
      app.service('media').create({
        multerId: 'asd',
        filename: dataUpload.filename,
        externalUrl: null,
        mimetype: dataUpload.mimetype,
        filesize: dataUpload.filesize,
        originalFilename: cpFile.fileEntry.name,
        key: ''
      }).then((mediaAxios) => {
        console.log('sukses create media', mediaAxios)
        // console.log('sukses create media', mediaAxios.data._id)
        resolve({
          data: mediaAxios
        })
      }).catch(e => {
        reject(e)
      })
    }, function (e) {
      reject(e)
    })
  })
}

export async function insertMessages ({ state, commit, dispatch }, selects) {
  let nS = []
  for (let index = 0; index < selects.length; index++) {
    let element = selects[index]
    try {
      const params = JSON.parse(element.params)
      element = { ...element, params }
      if (params.refId) {
        const message = await dispatch('getMessageByUID', params.refId)
        let name = ''
        if (message.fromid === state.user._id) {
          name = 'You'
        } else {
          const contact = await dispatch('findContactDetail', message.fromid)
          name = contact.name
        }
        element.params = {
          ...element.params,
          replyMessage: {
            ...message,
            name
          }
        }
      }
    } catch (error) {
    }
    nS = [...nS, element]
  }
  commit('insertMessages', [...nS].reverse())
}

export async function addMessageToList ({ state, commit, dispatch }, element) {
  console.log('addMessageToList')
  try {
    const params = JSON.parse(element.params)
    element = { ...element, params }
    if (params.refId) {
      const message = await dispatch('getMessageByUID', params.refId)
      let name = ''
      if (message.fromid === state.user._id) {
        name = 'You'
      } else {
        const contact = await dispatch('findContactDetail', message.fromid)
        name = contact.name
      }
      element.params = {
        ...element.params,
        replyMessage: {
          ...message,
          name
        }
      }
    }
  } catch (error) {
    // console.log('addMessageToList', error)
  }
  commit('addMessage', element)
}

export async function findConvDetail ({ state }, convid) {
  let contact = _.find(state.contacts, { _id: convid })
  if (!contact) {
    contact = _.find(state.convs, { convid: convid })
    if (contact && contact.members) {
      try {
        contact.members = JSON.parse(contact.members)
        contact.admins = JSON.parse(contact.admins)
        contact.members = _.map(contact.members, (id) => {
          if (id === state.user._id) {
            console.log('own user', state.user)
            return state.user
          } else {
            return _.find(state.contacts, { _id: id })
          }
        })
        contact.membersName = _.map(contact.members, (c) => {
          if (c._id === state.user._id) {
            return 'you'
          } else {
            return c.name
          }
        })
        contact.joinStringMember = _.join(contact.membersName, ', ')
        console.log('taek', contact.joinStringMember)
      } catch (error) {
        console.log('cur err', error)
      }
    }
  }
  return contact != null ? contact : {}
}

export async function createBroadCast ({ state, dispatch }, members) {
  let data = []
  for (let index = 0; index < members.length; index++) {
    const element = members[index]
    console.log(element)
    const contact = await dispatch('findContactDetail', element._id)
    data = [...data, contact.name]
  }
  console.log(new bson.ObjectId().toString())
  return await dispatch('updateConv', {
    message: '',
    convid: new bson.ObjectId(),
    name: _.join(data, ', '),
    phoneNumber: '',
    updatedAt: new Date().toISOString(),
    imgProfile: '',
    isGroup: false,
    isBroadcast: true,
    members: _.map(members, e => e._id),
    admins: [],
    publicKey: '',
    privateKey: '',
    unreadCount: 0
  })
}
