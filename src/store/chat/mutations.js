var _ = require('lodash')
const colors = ['red-10', 'pink-10', 'purple-10', 'deep-purple', 'indigo-10', 'blue-10', 'light-blue-10', 'cyan-10', 'teal-10', 'green-10', 'light-green-10', 'lime-10', 'yellow-10', 'amber-10', 'orange-10', 'deep-orange-10', 'brown-10', 'grey-10', 'blue-grey-10']
var addedColor = {}
var moment = require('moment')
function convert (state, data) {
  const contact = _.find(state.contacts, { _id: data.fromid })
  let color = 'green-14'
  if (contact) {
    if (!addedColor[data.fromid]) {
      color = _.sample(colors)
      addedColor[data.fromid] = color
    } else {
      color = addedColor[data.fromid]
    }
  }
  if (contact) {
    return { ...data, fromContact: contact, color: color }
  } else {
    const c = {
      name: 'uknown',
      _id: data.fromid
    }
    return { ...data, fromContact: c, color: color }
  }
}

export function updateMessageToSucces (state, data) {
  state.dataMessage = _.map(state.dataMessage, (e) => {
    console.log('juancok ilesss', e)
    if (e.status < 3 && e.createdAt < data.createdAt) {
      return {
        ...e,
        status: 3
      }
    } else {
      return {
        ...e
      }
    }
  })
}

export function contacts (state, data) {
  state.contacts = data
}

export function insertContact (state, data) {
  state.contacts = [...state.contacts, data]
}

export function messages (state, data) {
  state.messages = _.map(data, (e) => {
    return convert(state, e)
  })
}

export function setConv (state, data) {
  state.convs = _.map(data, (e) => {
    let _c = { ...e }
    try {
      const params = JSON.parse(_c.params)
      _c = {
        ..._c,
        ...params
      }
    } catch (error) {
    }
    return _c
  })
}

export function insertMessages (state, data) {
  _.each(data, (e) => {
    const m = moment(e.createdAt)
    const curDate = m.isSame(moment(), 'week') ? m.format('dddd') : m.format('DD/MM/YYYY')
    if (state.dataMessage.length > 0 && String(state.dataMessage[0].mediaType) === '12') {
      if (curDate === state.dataMessage[0].date) {
        const [, ...rest] = state.dataMessage
        // const [deleted, ...rest] = state.dataMessage
        // console.log('deleted', deleted)
        state.dataMessage = [{
          mediaType: 12,
          createdAt: e.createdAt,
          rowid: data.uid,
          date: curDate
        }, convert(state, e), ...rest]
      } else {
        state.dataMessage = [{
          mediaType: 12,
          createdAt: e.createdAt,
          rowid: data.uid,
          date: curDate
        }, convert(state, e), ...state.dataMessage]
      }
    } else {
      state.dataMessage = [{
        mediaType: 12,
        createdAt: e.createdAt,
        rowid: data.uid,
        date: curDate
      }, convert(state, e), ...state.dataMessage]
    }
  })
  // state.dataMessage = [..._.map(data, (e) => {
  //   return convert(state, e)
  // }), ...state.dataMessage]
}

export function notifAddMessage (state, data) {
  state.newMessage++
}

// recipientStatus should be not update also
export function updateMessage (state, data) {
  var index = _.findIndex(state.dataMessage, { _id: data._id })
  if (index > -1) {
    const _data = {
      ...state.dataMessage[index],
      ...data,
      status: state.dataMessage[index].status > data.status ? state.dataMessage[index].status : data.status
    }
    state.dataMessage.splice(index, 1, _data)
  }
}

export function switchSelected (state, data) {
  var index = _.findIndex(state.dataMessage, { _id: data._id })
  console.log(state.dataMessage[index], data)
  if (index > -1) {
    const _data = {
      ...state.dataMessage[index],
      selected: !state.dataMessage[index].selected
    }
    state.dataMessage.splice(index, 1, _data)
  }
}

export function clearSelected (state) {
  _.each(state.dataMessage, (e) => {
    e.selected = false
  })
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

export function logout (state, data) {
  state.contacts = []
  state.user = null
  state.currentUserId = ''
  state.limit = 0
  state.dataMessage = []
  state.onlineUser = null
  state.custom = null
  state.convs = []
}

export function resume (state) {
  state.appRunning = true
}

export function pause (state) {
  state.appRunning = false
}

export function setSelectedForGroup (state, data) {
  state.selectedCreateGroup = data
}

export function setPrivatekey (state, data) {
  state.privateKey = data
}

export function setAesKey (state, data) {
  state.aesKey = data
}

export function setIv (state, data) {
  state.iv = data
}
