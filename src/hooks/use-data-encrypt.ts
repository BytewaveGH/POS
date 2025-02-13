'use client'

import CryptoJS from 'crypto-js'

export const userDataCrypt = (action: 'encrypt' | 'decrypt' | 'hashing', key: string, value: string) => {
  const NotFound = 'UserData not found'

  try {
    if (value === undefined || value === null) {
      return NotFound
    }

    switch (action) {
      case 'encrypt': {
        return CryptoJS.AES.encrypt(value, key).toString()
      }

      case 'decrypt': {
        const bytes = CryptoJS.AES.decrypt(value, key)
        return bytes.toString(CryptoJS.enc.Utf8) || NotFound
      }

      case 'hashing': {
        return CryptoJS.SHA256(value).toString()
      }
      default: {
        throw new Error('Invalid action type')
      }
    }
  } catch (error) {
    console.error('Error processing data:', error)
    return error
  }
}
