const crypto = window.crypto.subtle
const enc = new TextEncoder()
const dec = new TextDecoder()

function arrayBufferToHex (arrayBuffer) {
  var s = '',
    h = '0123456789ABCDEF'
  new Uint8Array(arrayBuffer).forEach((v) => {
    s += h[v >> 4] + h[v & 15]
  })
  return s
}

function hexToArrayBuffer (hex) {
  if (typeof hex !== 'string') {
    throw new TypeError('Expected input to be a string')
  }

  if (hex.length % 2 !== 0) {
    throw new RangeError('Expected string to be an even number of characters')
  }

  var view = new Uint8Array(hex.length / 2)

  for (var i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }

  return view.buffer
}

export async function importAes ({ state, dispatch }, key) {
  return await crypto.importKey('raw', hexToArrayBuffer(key), 'AES-GCM', true, ['encrypt', 'decrypt'])
}

export function hexToArrayBufferData ({ state, dispatch }, key) {
  return hexToArrayBuffer(key)
}

export async function genKeyPair ({ state, dispatch }) {
  const data = await this._vm.$appFeathers.service('userkey').find({ query: { userId: state.user._id } })

  if (data.data.length === 0) {
    const keyPair = await crypto.generateKey({
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    }, true, ['encrypt', 'decrypt'])

    const jwkPublicKey = await crypto.exportKey('jwk', keyPair.publicKey)
    const jwkPrivateKey = await crypto.exportKey('jwk', keyPair.privateKey)
    console.log('jwkPublicKey', jwkPublicKey)
    const key = await crypto.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const rawAes = await crypto.exportKey('raw', key)

    await this._vm.$appFeathers.service('userkey').create({
      privateKey: JSON.stringify(jwkPrivateKey),
      publicKey: JSON.stringify(jwkPublicKey),
      aesKey: arrayBufferToHex(rawAes),
      iv: arrayBufferToHex(iv)
    })

    await dispatch('setSetting', {
      key: 'privatekey',
      value: JSON.stringify(jwkPrivateKey)
    })
    await dispatch('setSetting', {
      key: 'aesKey',
      value: arrayBufferToHex(rawAes)
    })
    await dispatch('setSetting', {
      key: 'iv',
      value: arrayBufferToHex(iv)
    })

    return {
      privateKey: jwkPrivateKey,
      aesKey: key,
      iv: iv
    }
  } else {
    const key = data.data[0]
    console.log(JSON.stringify(data))
    dispatch('setSetting', {
      key: 'privatekey',
      value: key.privateKey
    })
    dispatch('setSetting', {
      key: 'aesKey',
      value: key.aesKey
    })
    dispatch('setSetting', {
      key: 'iv',
      value: key.iv
    })
    const importedKey = await crypto.importKey('raw', hexToArrayBuffer(key.aesKey), 'AES-GCM', true, ['encrypt', 'decrypt'])
    return {
      privateKey: JSON.parse(key.privateKey),
      aesKey: importedKey,
      iv: hexToArrayBuffer(key.iv)
    }
  }
}

export async function loadKey ({ commit, dispatch }) {
  let privateKey = ''
  let aesKey = ''
  let iv = ''
  try {
    privateKey = await dispatch('getSetting', {
      key: 'privatekey'
    })

    privateKey = JSON.parse(privateKey)

    aesKey = await dispatch('getSetting', {
      key: 'aesKey'
    })
    console.log('loaded all data error', aesKey)

    aesKey = await crypto.importKey('raw', hexToArrayBuffer(aesKey), 'AES-GCM', true, ['encrypt', 'decrypt'])
    iv = await dispatch('getSetting', {
      key: 'iv'
    })
    iv = hexToArrayBuffer(iv)
  } catch (error) {
    console.log('loaded all data error', error)
    const data = await dispatch('genKeyPair')
    privateKey = data.privateKey
    aesKey = data.aesKey
    iv = data.iv
  }
  console.log('loaded all data ok', privateKey, aesKey, iv)
  commit('setPrivatekey', privateKey)
  commit('setAesKey', aesKey)
  commit('setIv', iv)
}

export async function encryptChatMessage ({ commit, dispatch }, { text, publicKey }) {
  const encodedChatMessage = enc.encode(text)
  const importedPublicKey = await crypto.importKey(
    'jwk',
    publicKey,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' }
    },
    false,
    ['encrypt']
  )

  const encryptedArrayBuffer = await crypto.encrypt(
    {
      name: 'RSA-OAEP'
    },
    importedPublicKey,
    encodedChatMessage
  )
  const encryptedHexText = arrayBufferToHex(encryptedArrayBuffer)
  return encryptedHexText
}

// encryip text return text
export async function encryptAes ({ commit, dispatch }, { text, aesKey, iv }) {
  const encodedChatMessage = enc.encode(text)
  const encryptedArrayBuffer = await crypto.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, encodedChatMessage)
  const encryptedHexText = arrayBufferToHex(encryptedArrayBuffer)
  return encryptedHexText
}

// encrypt arraybuffer return arraybuffer
export async function encryptAesArrayBuffer ({ commit, dispatch }, { arrayBuffer, aesKey, iv }) {
  const encodedChatMessage = arrayBuffer
  const encryptedArrayBuffer = await crypto.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, encodedChatMessage)
  return encryptedArrayBuffer
}

export async function decryptAes ({ commit, dispatch }, { text, aesKey, iv }) {
  const encryptedArrayBufferFromHex = hexToArrayBuffer(text)
  const decryptedArrayBuffer = await crypto.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, encryptedArrayBufferFromHex)
  const decryptedText = dec.decode(decryptedArrayBuffer)

  // //   This is what u show in chat
  return decryptedText
}

export async function decryptAesBuffer ({ commit, dispatch }, { arrayBuffer, aesKey, iv }) {
  const decryptedArrayBuffer = await crypto.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, arrayBuffer)
  // //   This is what u show in chat
  return decryptedArrayBuffer
}

export async function decryptChatMessage ({ commit, dispatch }, { text, privateKey }) {
  const encryptedArrayBufferFromHex = hexToArrayBuffer(text)
  console.log('start dec', encryptedArrayBufferFromHex)
  const importedPrivateKey = await crypto.importKey(
    'jwk',
    privateKey,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' }
    },
    false,
    ['decrypt']
  )
  console.log('start dec 2')

  const decryptedArrayBuffer = await crypto.decrypt(
    {
      name: 'RSA-OAEP'
    },
    importedPrivateKey,
    encryptedArrayBufferFromHex
  )
  console.log('start dec 3', decryptedArrayBuffer)

  // //   This is what u show in chat
  return dec.decode(decryptedArrayBuffer)
}
