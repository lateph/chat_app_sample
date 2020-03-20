/*
export function someAction (context) {
}
*/

export function doSignup ({ state }, { email, password, name }) {
  return new Promise((resolve, reject) => {
    this._vm.$socket.emit('create', 'users', {
      email,
      password,
      name
    }, (error, message) => {
      if (error) {
        reject(error)
      } else {
        resolve(message)
      }
    })
  })
}

export function doLogin ({ state, dispatch, commit }, { email, password, strategy }) {
  return new Promise((resolve, reject) => {
    this._vm.$socket.emit('create', 'authentication', {
      email,
      password,
      strategy
    }, (error, message) => {
      if (error) {
        reject(error)
      } else {
        commit('user', message.user)
        dispatch('reloadContact')
        resolve(message)
      }
    })
  })
}

export function doLoginJwt ({ state, dispatch, commit }, { jwt }) {
  return new Promise((resolve, reject) => {
    this._vm.$socket.emit('create', 'authentication', {
      accessToken: jwt,
      strategy: 'jwt'
    }, (error, message) => {
      if (error) {
        reject(error)
      } else {
        console.log(message)
        commit('user', message.user)
        dispatch('reloadContact')
        resolve(message)
      }
    })
  })
}

export function reloadContact ({ state, commit }) {
  return new Promise((resolve, reject) => {
    this._vm.$socket.emit('find', 'users', { $sort: { updateAt: -1 }, _id: { $ne: state.user._id } }, (error, data) => {
    //   console.log('ok cok', data.data)
      if (!error) {
        commit('contacts', data.data)
      } else {
        console.log(data)
      }
    })
  })
}

export function sendChat ({ state, commit }, { text }) {
  return new Promise((resolve, reject) => {
    this._vm.$socket.emit('create', 'messages', {
      from: state.user._id,
      to: [state.currentUserId],
      text: text
    }, (error, message) => {
      if (error) {
        reject(error)
      } else {
        resolve(message)
      }
    })
  })
}

export function current ({ state, commit }) {
  return new Promise((resolve, reject) => {
    console.log('load data', state)
    console.log('load data user_id', state.user._id)
    console.log('load data currentUserId', state.currentUserId)
    this._vm.$socket.emit('find', 'messages', { $limit: 8, $sort: { createdAt: 1 }, $or: [{ from: state.user._id, to: { $in: [state.currentUserId] } }, { from: state.currentUserId, to: { $in: [state.user._id] } }] }, (error, data) => {
    //   console.log('ok cok', data.data)
      if (!error) {
        resolve(data.data)
        commit('messages', data.data)
        console.log('Found all message', data)
      } else {
        reject(error)
        console.log(data)
      }
    })
  })
}
