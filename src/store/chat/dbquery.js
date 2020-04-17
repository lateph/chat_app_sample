import { uid } from 'quasar'

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
      tx.executeSql('INSERT INTO message VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', data, (tx, result) => {
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

export function insertContact ({ state }, row) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('INSERT INTO contact VALUES (?,?,?,?,?,?)', [row._id, row.email, row.name, row.phone, row.country, row.publicKey], (tx, result) => {
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
  this._vm.$db.transaction((tx) => {
    tx.executeSql('SELECT * FROM conv WHERE convid = ?', [data.convid], (tx, messageResult) => {
      let selects = messageResult.rows._array
      if (!selects) {
        selects = messageResult.rows
      }
      if (selects.length > 0) {
        const conv = selects[0]
        // console.log('mulai update conv')
        tx.executeSql('UPDATE conv SET message = ?, updatedAt = ?, unreadCount = ?, name = ?, phone = ?  WHERE convid = ?', [data.message, data.updatedAt, state.currentUserId === data.convid ? 0 : conv.unreadCount + 1, data.name, data.phone, data.convid], (tx, messageResult) => {
          dispatch('loadConv')
        })
      } else {
        console.log('mulai insert conv')
        tx.executeSql('INSERT INTO conv VALUES(?,?,?,?,?,?)', [data.message, data.convid, data.name, data.phone, state.currentUserId === data.convid ? 0 : 1, data.updatedAt], (tx, messageResult) => {
          dispatch('loadConv')
        })
      }
    })
  }, (e) => {
    console.log('update conv gagal', e)
  }, () => {
    // console.log('update conv success')
  })
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

export function saveChat ({ state, commit, dispatch }, { text, mediaId, mediaType, localFile, thumb }) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      const _uid = uid()
      const recipientStatus = [{ _id: state.currentUserId, status: 0 }]
      tx.executeSql('INSERT INTO message VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [_uid, text, state.currentUserId, state.user._id, JSON.stringify([state.currentUserId]), new Date().toISOString(), new Date().toISOString(), 0, JSON.stringify(recipientStatus), mediaId, mediaType, localFile, thumb], (tx, result) => {
        commit('addMessage', {
          message: text,
          rowid: result.insertId,
          _id: _uid,
          contact: state.currentUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fromid: state.user._id,
          mediaType,
          localFile,
          thumb,
          mediaId,
          status: 0
        })
      })
    }, (e) => {
      reject(e)
    }, () => {
      console.log('insert ok')
      dispatch('findContactDetail', state.currentUserId).then((c) => {
        console.log('insert ok 2')
        dispatch('updateConv', {
          message: text,
          convid: state.currentUserId,
          name: c.name,
          phone: c.phone,
          updatedAt: new Date().toISOString()
        }).then(() => {
          console.log('insert ok 3')
          resolve(true)
        }).catch(e => {
          console.log(e)
        })
      }).catch(e => {
        console.log(e)
      })
    })
  })
}

export function loadLocalContact ({ state, commit }) {
  console.log('load local contact')
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(function (tx) {
      tx.executeSql('SELECT rowid, _id, email, name, phone, country FROM contact WHERE publickey != ?', [''], (tx, rs) => {
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

export function getPublicKey ({ commit }, _id) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('SELECT * FROM contact WHERE _id = ?', [_id], (tx, messageResult) => {
        let selects = messageResult.rows._array
        if (!selects) {
          selects = messageResult.rows
        }
        if (selects.length > 0 && selects[0].publickey) {
          const message = selects[0]
          resolve(JSON.parse(message.publickey))
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
