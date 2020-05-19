var _ = require('lodash')

export function currentUser (state) {
  let contact = _.find(state.contacts, { _id: state.currentUserId })
  if (!contact) {
    contact = _.find(state.convs, { convid: state.currentUserId })
    if (contact && contact.members) {
      try {
        contact.members = JSON.parse(contact.members)
        contact.members = _.map(contact.members, (id) => {
          if (id === state.user._id) {
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
      }
    }
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
