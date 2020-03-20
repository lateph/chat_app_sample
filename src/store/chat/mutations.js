var _ = require('lodash')

function convert (state, data) {
  const contact = _.find(state.contacts, { _id: data.from })
  return { ...data, fromContact: contact }
}

export function contacts (state, data) {
  state.contacts = data
}

export function messages (state, data) {
  state.messages = _.map(data, (e) => {
    return convert(state, e)
  })
}

export function addMessage (state, data) {
  console.log('oke', data)
  if (state.currentUserId === data.to[0] || state.currentUserId === data.from) {
    state.messages = [...state.messages, convert(state, data)]
  }
}

export function clearMessage (state, data) {
  state.messages = []
}

export function user (state, data) {
  state.user = data
}

export function setCurrent (state, data) {
  state.currentUserId = data
}
