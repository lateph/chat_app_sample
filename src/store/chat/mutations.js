var _ = require('lodash')

function convert (state, data) {
  const contact = _.find(state.contacts, { _id: data.fromid })
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

export function insertMessages (state, data) {
  state.dataMessage = [..._.map(data, (e) => {
    return convert(state, e)
  }), ...state.dataMessage]
}

export function updateMessage (state, data) {
  var index = _.findIndex(state.dataMessage, { _id: data._id })
  state.dataMessage.splice(index, 1, data)
}

export function addMessage (state, data) {
  state.dataMessage = [...state.dataMessage, convert(state, data)]
}

export function clearMessage (state, data) {
  state.dataMessage = []
}

export function user (state, data) {
  state.user = data
}

export function setCurrent (state, data) {
  state.dataMessage = []
  state.currentUserId = data
  state.onlineUser = null
}

export function removeCurrent (state) {
  state.dataMessage = []
  state.currentUserId = ''
}

export function setLimit (state, data) {
  state.limit = data
}

export function setCurrentOnlineUser (state, data) {
  state.onlineUser = data
}

export function setCustoms (state, data) {
  state.custom = data
}
