var _ = require('lodash')
var falsy = /^(?:f(?:alse)?|no?|0+)$/i
Boolean.parse = function (val) {
  return !falsy.test(val) && !!val
}

export function currentUser (state) {
  let contact = _.find(state.contacts, { _id: state.currentUserId })
  const conv = _.find(state.convs, { convid: state.currentUserId })
  if (!contact) {
    contact = {
      ...conv
    }
    if (contact && contact.members) {
      try {
        contact.members = JSON.parse(contact.members)
        contact.admins = JSON.parse(contact.admins)
        contact.isGroup = Boolean.parse(contact.isGroup)
        contact.isBroadcast = Boolean.parse(contact.isBroadcast)
        contact.members = _.map(contact.members, (id) => {
          if (id === state.user._id) {
            console.log('own user', state.user)
            return state.user
          } else {
            const f = _.find(state.contacts, { _id: id })
            if (f) {
              return f
            } else {
              return {
                _id: id,
                name: 'uknown',
                email: 'A'
              }
            }
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
    } else {
      contact.members = []
      contact.admins = []
      contact.membersName = ''
    }
  }
  return contact != null ? contact : {
    members: [],
    admins: [],
    membersName: ''
  }
}

export function messages (state) {
  // console.log(state.dataMessage)
  // return state.dataMessage
  return _.map(state.dataMessage, e => {
    const mt = String(e.mediaType)
    if (mt === '11') {
      return {
        ...e,
        message: JSON.parse(e.message)
      }
    } else {
      return e
    }
  })
}

export function convList (state) {
  return state.contacts
}
