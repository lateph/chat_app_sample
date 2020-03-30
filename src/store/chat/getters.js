var _ = require('lodash')

export function currentUser (state) {
  const contact = _.find(state.contacts, { _id: state.currentUserId })
  return contact != null ? contact : {}
}

export function messages (state) {
  // console.log(state.dataMessage)
  // return state.dataMessage
  return state.dataMessage
}
