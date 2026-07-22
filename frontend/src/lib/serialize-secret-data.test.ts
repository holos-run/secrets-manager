import { serializeSecretData } from './serialize-secret-data'

describe('serializeSecretData', () => {
  it('sorts keys before serializing', () => {
    const encoder = new TextEncoder()

    expect(serializeSecretData({
      zebra: encoder.encode('last'),
      alpha: encoder.encode('first'),
    })).toBe('{"alpha":"first","zebra":"last"}')
  })

  it('decodes byte values as UTF-8 strings', () => {
    const encoder = new TextEncoder()

    expect(serializeSecretData({ message: encoder.encode('hello, 🌍') }))
      .toBe('{"message":"hello, 🌍"}')
  })
})
