import { uid } from 'quasar'
var _ = require('lodash')
var falsy = /^(?:f(?:alse)?|no?|0+)$/i
Boolean.parse = function (val) {
  return !falsy.test(val) && !!val
}

export function getMessageByUID ({ state, commit, dispatch }, uid) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('SELECT * FROM message WHERE _id = ?', [uid], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0) {
          const message = selects[0]
          resolve(message)
        } else {
          resolve(false)
        }
      })
    }, () => {
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export function insertMessage ({ state }, data) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('INSERT INTO message VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', data, (tx, result) => {
        resolve(result)
      })
    }, (e) => {
      console.log(e)
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export async function insertContact ({ state, dispatch }, row) {
  console.log('row.aesKey', row.aesKey)
  console.log('row.iv', row.iv)
  console.log('pl', state.privateKey)
  const aesKey = await dispatch('decryptChatMessage', {
    text: row.aesKey,
    privateKey: state.privateKey
  })
  const iv = await dispatch('decryptChatMessage', {
    text: row.iv,
    privateKey: state.privateKey
  })
  return await new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('INSERT OR REPLACE INTO contact VALUES (?,?,?,?,?,?,?,?,?)', [row._id, row.email, row.nameId, row.phoneNumber, row.country, row.publicKey, aesKey, iv, row.imgProfile], (tx, result) => {
        resolve(result)
      })
    }, (e) => {
      console.log(e)
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export function updateMessageStatus ({ state }, data) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('UPDATE message SET status = ?, recipientStatus = ? WHERE _id = ? and status < ?', [
        data.status,
        data.recipientStatus,
        data.uid,
        data.status
      ], (tx, result) => {
        resolve(result)
      })
    }, (e) => {
      console.log(e)
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export function getUnsentDeleteMessage ({ state, commit, dispatch }) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('SELECT * FROM message WHERE status = ?', [4], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        resolve(selects)
      })
    }, () => {
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export function updateProfile ({ state }, d) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('UPDATE contact SET email = ?, name = ?, phoneNumber = ?, imgProfile = ? WHERE _id = ?', [d.email, d.nameId, d.phoneNumber, d.imgProfile, d._id], (tx, result) => {
        console.log('sukses update', result)
        resolve(result)
      })
    }, (e) => {
      console.log(e)
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export async function deleteMessageStatus ({ state, dispatch }, data) {
  await new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('UPDATE message SET status = ?, message = ? WHERE _id = ? and status < ?', [
        data.status,
        '',
        data.uid,
        data.status
      ], (tx, result) => {
        resolve(result)
      })
    }, (e) => {
      console.log(e)
      reject(false)
    }, () => {
      // reject(false)
    })
  })
  const message = await dispatch('getMessageByUID', data.uid)
  const max = await new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('select _id, max(rowid) from message where convid = ?', [message.convid], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0) {
          const message = selects[0]
          resolve(message)
        } else {
          resolve(false)
        }
      })
    }, () => {
      reject(false)
    }, () => {
      // reject(false)
    })
  })
  if (max._id === data.uid) {
    dispatch('updateConvEmpty', message.convid)
  }
}

export function updateMessageLocalFile ({ state }, { localFile, _id }) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('UPDATE message SET localFile = ? WHERE _id = ?', [localFile, _id], (tx, result) => {
        resolve(result)
      })
    }, (e) => {
      console.log(e)
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export function updateConv ({ state, commit, dispatch }, data) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction((tx) => {
      tx.executeSql('SELECT * FROM conv WHERE convid = ?', [data.convid], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0) {
          const conv = selects[0]
          // console.log('mulai update conv')
          let members = data.members
          const jsonConvMembers = JSON.parse(conv.members)
          if (!members) {
            members = jsonConvMembers
          }
          console.log('update members', conv, members)
          if (jsonConvMembers.length > members.length) {
            console.log('update all message karena ada yang dihapus')
            _.forEach(_.difference(jsonConvMembers, members), (e) => {
              dispatch('removeMemberFromMessage', {
                member: e,
                convid: conv.convid
              }).catch(e => {
                console.log('%c error remove mmeber ', 'background: #222; color: red', e)
              })
            })
          }

          let admins = data.admins
          if (!admins) {
            admins = JSON.parse(conv.admins)
          }
          let unreadCount = data.unreadCount
          if (unreadCount === undefined || unreadCount === null) {
            let _c = parseInt(conv.unreadCount)
            if (isNaN(_c)) {
              _c = 0
            }
            unreadCount = state.currentUserId === data.convid ? 0 : _c + 1
          }
          if (!data.message && conv.message) {
            data.message = conv.message
          }
          console.log(data.updatedAt)
          if (data.updatedAt && conv.updatedAt && data.updatedAt < conv.updatedAt) {
            data.updatedAt = conv.updatedAt
          }
          tx.executeSql('UPDATE conv SET message = ?, updatedAt = ?, unreadCount = ?, name = ?, phoneNumber = ?, members = ?, admins = ?  WHERE convid = ?', [data.message, data.updatedAt, unreadCount, data.name, data.phoneNumber, JSON.stringify(members), JSON.stringify(admins), data.convid], (tx, messageResult) => {
            console.log('loadConv')
            dispatch('loadConv').then(() => {
              resolve(true)
            }).catch(() => {
              resolve('fail update')
            })
          })
        } else {
          console.log('mulai insert conv', data)
          const isGroup = !!data.isGroup
          let members = data.members
          if (!members) {
            members = []
          }
          let admins = data.admins
          if (!admins) {
            admins = []
          }
          let unreadCount = data.unreadCount
          if (unreadCount === undefined || unreadCount === null) {
            unreadCount = state.currentUserId === data.convid ? 0 : 1
          }
          if (!data.isBroadcast) {
            data.isBroadcast = ''
          }
          tx.executeSql('INSERT INTO conv VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [data.message, data.convid, data.name, data.phoneNumber, unreadCount, data.updatedAt, data.imgProfile, isGroup, data.isBroadcast, JSON.stringify(members), JSON.stringify(admins), data.publicKey, data.privateKey, data.aesKey, data.iv, JSON.stringify({ createdBy: data.createdBy, createdAt: data.createdAt, createdByName: data.createdByName })], (tx, messageResult) => {
            console.log('loadConv')
            dispatch('loadConv').then(() => {
              resolve(true)
            }).catch(() => {
              resolve('fail insert')
            })
          })
        }
      })
    }, (e) => {
      resolve(e)
      console.log('update conv gagal', e)
    }, () => {
      // resolve(false)
    })
  })
}

export function updateConvEmpty ({ state, commit, dispatch }, convid) {
  console.log('update conv to empty')
  this._vm.$db.transaction((tx) => {
    tx.executeSql('UPDATE conv SET message = ? WHERE convid = ?', ['', convid], (tx, messageResult) => {
      dispatch('loadConv')
    })
  }, (e) => {
    console.log('update conv gagal', e)
  }, () => {
    // console.log('update conv success')
  })
}

export async function updateConvProfile ({ state, commit, dispatch }, data) {
  console.log('update conv to empty')
  await new Promise((resolve, reject) => {
    this._vm.$db.transaction((tx) => {
      tx.executeSql('UPDATE conv SET name = ?, phoneNumber = ?, imgProfile = ? WHERE convid = ?', [data.nameId, data.phoneNumber, data.imgProfile, data._id], (tx, messageResult) => {
        // dispatch('loadConv')
        resolve(true)
        console.log('update conv suces', messageResult)
      })
    }, (e) => {
      resolve(true)
      console.log('update conv gagal', e)
    }, () => {
      // console.log('update conv success')
    })
  })
}

export async function updateConvBroadcast ({ state, commit, dispatch }, data) {
  const broadcastlist = await new Promise((resolve, reject) => {
    this._vm.$db.transaction(function (tx) {
      // tx.executeSql('SELECT * FROM message WHERE rowid in (SELECT MAX(rowid) from message GROUP BY convid)', [], (tx, rs) => {
      tx.executeSql('SELECT * FROM conv WHERE isBroadcast = ? and members LIKE ?', [true, '%' + data._id + '%'], (tx, rs) => {
        let selects = rs.rows._array
        if (!selects) {
          selects = rs.rows
        }
        resolve(selects)
      }, function (tx, error) {
        console.log('total user e ', error)
        resolve([])
      })
    })
  })
  console.log('braod cast list to update', broadcastlist)
  for (let i = 0; i < broadcastlist.length; i++) {
    const broadcast = broadcastlist[i]
    const members = JSON.parse(broadcast.members)
    let names = []
    for (let j = 0; j < members.length; j++) {
      const m = members[j]
      const c = await dispatch('findContactDetail', m)
      names = [...names, c.name]
    }
    const newName = _.join(names, ', ')
    await new Promise((resolve, reject) => {
      this._vm.$db.transaction((tx) => {
        tx.executeSql('UPDATE conv SET name = ? WHERE convid = ?', [newName, broadcast.convid], (tx, messageResult) => {
          // dispatch('loadConv')
          console.log('update conv suces', messageResult)
          resolve(true)
        })
      }, (e) => {
        console.log('update conv gagal', e)
      }, () => {
        resolve(true)
        // console.log('update conv success')
      })
    })
  }
}

export function updateConvToZero ({ state, commit, dispatch }, convid) {
  this._vm.$db.transaction((tx) => {
    tx.executeSql('UPDATE conv SET unreadCount = ? WHERE convid = ?', [0, convid], (tx, messageResult) => {
      dispatch('loadConv')
    })
  }, (e) => {
    console.log('update conv gagal', e)
  }, () => {
    // console.log('update conv success')
  })
}

export async function saveChat ({ state, commit, dispatch, getters }, params) {
  const c = getters.currentUser
  const _uid = uid()
  if (c.isBroadcast === true) {
    console.log('sent to members too', c)
    for (let i = 0; i < c.members.length; i++) {
      const element = c.members[i]
      await dispatch('saveChat2', {
        ...params,
        convid: element._id,
        broadcastId: _uid
      })
    }
  }
  return await dispatch('saveChat2', {
    ...params,
    convid: state.currentUserId,
    _uid: _uid
  })
}

export async function saveChat2 ({ state, commit, dispatch, getters }, paramsx) {
  let to = []
  let group = ''
  let { text, mediaId, mediaType, localFile, thumb, params, convid, broadcastId, _uid } = paramsx
  const c = await dispatch('findConvDetail', convid)
  const isBroadcast = Boolean.parse(c.isBroadcast)
  if (Boolean.parse(c.isGroup) === true) {
    _.each(c.members, (e) => {
      if (e._id !== state.user._id) {
        to.push(e._id)
      }
    })
    group = convid
  } else if (isBroadcast) {
    _.each(c.members, (e) => {
      if (e._id !== state.user._id) {
        to.push(e._id)
      }
    })
    // group = convid
  } else {
    to = [convid]
  }
  if (!params) {
    params = {}
  }
  if (!broadcastId) {
    broadcastId = ''
  }
  if (!_uid) {
    _uid = uid()
  }

  const dateNow = new Date().toISOString()

  return await new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      const recipientStatus = _.map(to, (e) => {
        return { _id: e, status: 0 }
      })
      tx.executeSql('INSERT INTO message VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?,?, ?,?)', [_uid, text, convid, state.user._id, JSON.stringify(to), new Date().toISOString(), new Date().toISOString(), 0, JSON.stringify(recipientStatus), mediaId, mediaType, localFile, thumb, group, JSON.stringify(params), broadcastId], (tx, result) => {
        if (convid === state.currentUserId) {
          dispatch('addMessageToList', {
            message: text,
            rowid: result.insertId,
            _id: _uid,
            contact: convid,
            createdAt: dateNow,
            updatedAt: dateNow,
            fromid: state.user._id,
            mediaType,
            localFile,
            thumb,
            mediaId,
            status: 0,
            params: JSON.stringify(params)
          })
        }
      })
    }, (e) => {
      reject(e)
    }, () => {
      console.log('insert ok')
      if (!group && !isBroadcast) {
        dispatch('findContactDetail', convid).then((c) => {
          console.log('insert ok 2')
          dispatch('updateConv', {
            message: text,
            convid: convid,
            name: c.name,
            phoneNumber: c.phoneNumber,
            imgProfile: c.imgProfile,
            updatedAt: dateNow
          }).then(() => {
            dispatch('updateConvToZero', convid)
            resolve(true)
          }).catch(e => {
            console.log(e)
          })
        }).catch(e => {
          console.log(e)
        })
      } else {
        if (String(mediaType) === '11') {
          text = ''
        }
        dispatch('updateConv', {
          message: text,
          convid: convid,
          name: c.name,
          phoneNumber: '',
          imgProfile: c.imgProfile,
          updatedAt: dateNow
        }).then(() => {
          dispatch('updateConvToZero', convid)
          resolve(true)
        }).catch(e => {
          console.log(e)
        })
      }
    })
  })
}

export function loadLocalContact ({ state, commit }) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(function (tx) {
      tx.executeSql('SELECT rowid, _id, email, name, phoneNumber, country, imgProfile FROM contact WHERE publickey != ?', [''], (tx, rs) => {
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
          reject('loadLocalContact fail')
        }
      }, function (tx, error) {
        console.log('total user e ', error)
        reject(error)
      })
    })
  })
}

export function getSetting ({ commit }, { key }) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('SELECT * FROM setting WHERE key = ?', [key], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0) {
          const message = selects[0]
          resolve(message.value)
        } else {
          reject(false)
        }
      })
    }, () => {
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export function updateSetting ({ state }, { key, value }) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('UPDATE setting SET value = ? WHERE key = ?', [value, key], (tx, result) => {
        resolve(value)
      })
    }, (e) => {
      console.log(e)
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export async function setSetting ({ dispatch }, { key, value }) {
  try {
    await dispatch('getSetting', {
      key,
      value
    })
    await dispatch('updateSetting', {
      key,
      value
    })
  } catch (error) {
    await dispatch('insertSetting', {
      key,
      value
    })
  }
}

export function insertSetting ({ state }, { key, value }) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('INSERT INTO setting VALUES (?,?)', [key, value], (tx, result) => {
        resolve(result)
      })
    }, (e) => {
      console.log(e)
      reject(false)
    }, () => {
      // reject(false)
    })
  })
}

export async function getContactKey ({ commit, dispatch }, _id) {
  const data = await new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('SELECT * FROM contact WHERE _id = ?', [_id], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0 && selects[0].publickey) {
          const message = selects[0]
          resolve(message)
        } else {
          reject('user pub key not found')
        }
      })
    }, () => {
      reject('user pub key not found')
    }, () => {
      // reject(false)
    })
  })
  const aesKey = await dispatch('importAes', data.aesKey)
  const iv = await dispatch('hexToArrayBufferData', data.iv)
  return {
    publicKey: JSON.parse(data.publickey),
    aesKey: aesKey,
    iv: iv
  }
}

export function getGroupPublicKey ({ commit }, _id) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('SELECT * FROM conv WHERE convid = ?', [_id], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0 && selects[0].publicKey) {
          const message = selects[0]
          resolve(JSON.parse(message.publicKey))
        } else {
          reject('group pub key not found 1')
        }
      })
    }, () => {
      reject('group pub key not found 2')
    }, () => {
      // reject(false)
    })
  })
}

export async function getGroupKey ({ commit, dispatch }, _id) {
  const data = await new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('SELECT * FROM conv WHERE convid = ?', [_id], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0) {
          const message = selects[0]
          resolve(message)
        } else {
          reject('group pub key not found 1')
        }
      })
    }, () => {
      reject('group pub key not found 2')
    }, () => {
      // reject(false)
    })
  })
  const aesKey = await dispatch('importAes', data.aesKey)
  const iv = await dispatch('hexToArrayBufferData', data.iv)
  return {
    privateKey: JSON.parse(data.privateKey),
    publicKey: JSON.parse(data.publicKey),
    aesKey: aesKey,
    iv: iv
  }
}

export function getGroupData ({ commit }, _id) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('SELECT * FROM conv WHERE convid = ?', [_id], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0 && selects[0]) {
          const message = selects[0]
          resolve(message)
        } else {
          reject('group data not found 1 ' + _id)
        }
      })
    }, () => {
      reject('group data not found 2 ' + _id)
    }, () => {
      // reject(false)
    })
  })
}

export async function removeMemberFromMessage ({ state, commit, dispatch }, { member, convid }) {
  console.log('removeMemberFromMessage', convid)
  const list = await new Promise((resolve, reject) => {
    this._vm.$db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM message WHERE convid=? and status < 3 and mediaType < 11 and fromid = ? ORDER BY createdAt', [convid, state.user._id], (tx, rs) => {
        let selects = rs.rows._array
        if (!selects) {
          selects = _.filter(rs.rows, (e) => {
            return parseInt(e.status) < 3
          })
        }
        if (selects.length > 0) {
          resolve(selects)
        } else {
          reject('loadMessage empty')
        }
      }, function (tx, error) {
        reject(error)
      })
    })
  })
  console.log('list to update', list, member)
  _.forEach(list, (e) => {
    dispatch('readMessage', {
      // status: data.status,
      // recipientStatus,
      // uid: data.uid
      // createdAt: "2020-06-16T04:55:21.154Z"
      from: member,
      status: 6,
      // to: "5ec228aaf74c57667e1d5aa3"
      uids: [e._id]
      // updatedAt: "2020-06-16T04:55:21.154Z"
    }).catch((e) => {
      console.log('gagal change status', e)
    })
  })
}
