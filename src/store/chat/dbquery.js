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

export function insertMessage ({ state }, data) {
  return new Promise((resolve, reject) => {
    this._vm.$db.transaction(async (tx) => {
      tx.executeSql('INSERT INTO message VALUES (?,?,?,?,?,?,?,?,?)', data, (tx, result) => {
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
      tx.executeSql('UPDATE message SET status = ?, recipientStatus = ? WHERE _id = ?', data, (tx, result) => {
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
        console.log('mulai update conv')
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
    console.log('update conv success')
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
    console.log('update conv success')
  })
}
