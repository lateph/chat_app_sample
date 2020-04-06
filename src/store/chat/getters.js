var _ = require('lodash')

export function currentUser (state) {
  let contact = _.find(state.contacts, { _id: state.currentUserId })
  if (!contact) {
    contact = _.find(state.convs, { convid: state.currentUserId })
  }
  return contact != null ? contact : {}
}

export function messages (state) {
  // console.log(state.dataMessage)
  // return state.dataMessage
  return state.dataMessage
}

export function convList (state) {
  return state.contacts
}
