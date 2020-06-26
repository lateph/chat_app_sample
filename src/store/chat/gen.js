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

    await this._vm.$appFeathers.service('userkey').create({
      privateKey: JSON.stringify(jwkPrivateKey),
      publicKey: JSON.stringify(jwkPublicKey)
    })

    await dispatch('setSetting', {
      key: 'privatekey',
      value: jwkPrivateKey
    })

    return jwkPrivateKey
  } else {
    const key = data.data[0]
    console.log(JSON.stringify(data))
    dispatch('setSetting', {
      key: 'privatekey',
      value: key.privateKey
    })
    return JSON.parse(key.privateKey)
  }
}

export async function loadKey ({ commit, dispatch }) {
  let privateKey = ''
  try {
    privateKey = await dispatch('getSetting', {
      key: 'privatekey'
    })
    privateKey = JSON.parse(privateKey)
  } catch (error) {
    privateKey = await dispatch('genKeyPair')
  }
  commit('setPrivatekey', privateKey)
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
