/// Shared RSA key material for BYOK envelope tests.
///
/// Captured from web WebCrypto and verified against `lib/byok/client.ts`
/// (Fixture B in `envelope_test.dart`). Only ever used in tests — the public
/// half is what `/api/byok/config` serves in production, so tests can encrypt
/// envelopes exactly like the app does.
library;

/// PKCS#8 private key matching [fixtureBPublicPem] (decryption side).
const fixtureBPrivatePem = '-----BEGIN PRIVATE KEY-----\n'
    'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEUxAxUAAWNmyk\n'
    'WEXqQ/Dppbg+IMavOK1VcvCMRJcbkqRNTF5YSDh4xhjY552DnvyVKmKc9Xj9U9xG\n'
    'AUiSXWBIfe7F5IX67w2/bYaWluV7iLu8a7WQ8KEQcyyZOBaWcItllcrhicSFtLpm\n'
    'EOPixaXr2hsbBAdrA9w9w9DF1rLQADf1bFGyI60/oN31awnEPh7t9GO3G5RmzaCZ\n'
    'A2C7CJ3YKY/qeG0Du/zqzJr5xrAKBPuajb75E24dfWyYKv8FwsXjo8LYPrnFDd61\n'
    'JrCOlg07cTNyBygDUNTLDlqEQ/YJSbQCtRXPedIW4rHT9M81yL4D76k6f+QXByab\n'
    'sSK4tnuZAgMBAAECggEAAJCFP50l00wM0It/9d9TVReFvBUkqhG0V/0zpYrZPEr9\n'
    'lbiOSGtTB/YQ6fyp2R9mmsYnpEuqBrX7kehwm7ipKNw0amZC8fxrqHxIpBoSQ9xE\n'
    '0Yz1EnB1LJWsY/FywCHBnyUu6Lawxj1d01+MJ9Pyku6kULFPcKBo59aP57g1WlPn\n'
    'NaAjTDRNq34fkbzrIajJOkPa8bMPoe6MFeBBpoocyn3KkRV/ui5BY5ipUH8zWKXe\n'
    '95xtgffKFoJcouB3bg7ZN+Jc1UxYechdQmN/wJnI7M61Y4u6EL+ISiO1SwaRALax\n'
    'gfEeiapjfKmCNkU7YnyN23PFvr7sudGTlIbVpG7bZwKBgQDpYrFYlvNo+IQQ0Ldr\n'
    'cKXVWstQC6qgKb+QuWUNXEGBTM80BUQKFhQL6/EkVQaTRyKpMYtoAQw06gCFA3HL\n'
    'CEfGfAhMKZLPUePnby43Au9PlapIoFn41kGVCgiHj2TJKS9xra3FRANm9NgaMjzU\n'
    'APEHniwXtkr79AjSN8UxRYbhJwKBgQDXWQrmyaRsA5njGV2ZmIB5cE+Sm+B6Dch3\n'
    'o6RF7wdqIAWi/pHjvEpwLZcMZ/TRtBEQUv8SzP7mYkKmcKZqS08nCHB5gQzuMG4O\n'
    'kqmGxJcdvpjiYzo+3UOovAMy5MLu2ROFrpPX1uQVKMZbQVBNnL+zBm7JURl0BAzk\n'
    'cCqW8dg1PwKBgE3U/A/vR33aYzC4anMKPkPI48TuHxkK0zgQnAK4oZ/dXbybhPVY\n'
    'J5dSODlFocu8DXMfcr5cmxWKdGHnpCtxt34aHypHMw6w4LBuA5uU/vorj35o+5hg\n'
    '2744el+7EoGDmq7unOUMqZXMUcVqu554Mem4djvyL0+XMtnof3rPFQxBAoGAWMI2\n'
    'oBEUWADT+KqHzbrxmRwVcBQXXbc4nTcxijGPGMrCCABtGTSOadYgn9hpK9XQAq5y\n'
    'u8kKduKhHgDoVn9bzHbKBQqPzczgT9lbTlTRBE1+rjC/3RFNxcpYdy2aut92EG94\n'
    'OEo2EBKSTyKIerTUvnE0UH3Aw/S3a6BfrX9Y4fkCgYEAh/6vgr2UP0t5hfgdgJlV\n'
    'onKbtYDAno3tFPGECk4bX0r6fdf8TiXE76k66YOrlnlYJK4/5vOpWDJaLiyTsFYq\n'
    'UUjDq55ZL5th7zFuy+rOa38/ypTyCZ8A1wYnYIo4xE7rxff0tu+GyHlB5uXJoip0\n'
    'gH2Xkv/AfVchk2oclZofwcA=\n'
    '-----END PRIVATE KEY-----\n';

/// Raw DER (base64) of the SPKI public key.
const fixtureBSpki =
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxFMQMVAAFjZspFhF6kPw6aW4PiDGrzitVXLwjESXG5KkTUxeWEg4eMYY2Oedg578lSpinPV4/VPcRgFIkl1gSH3uxeSF+u8Nv22Glpble4i7vGu1kPChEHMsmTgWlnCLZZXK4YnEhbS6ZhDj4sWl69obGwQHawPcPcPQxday0AA39WxRsiOtP6Dd9WsJxD4e7fRjtxuUZs2gmQNguwid2CmP6nhtA7v86sya+cawCgT7mo2++RNuHX1smCr/BcLF46PC2D65xQ3etSawjpYNO3EzcgcoA1DUyw5ahEP2CUm0ArUVz3nSFuKx0/TPNci+A++pOn/kFwcmm7EiuLZ7mQIDAQAB';

/// SPKI public key in PEM form — the exact shape `/api/byok/config` returns.
const fixtureBPublicPem =
    '-----BEGIN PUBLIC KEY-----\n$fixtureBSpki\n-----END PUBLIC KEY-----\n';
