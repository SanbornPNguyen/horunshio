import { jwtVerify, SignJWT } from 'jose'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET)

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret())
}

export async function verifyAuth(req) {
  const auth = req.headers['authorization'] || ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) throw new Error('Unauthorized')
  const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
  if (payload.role !== 'admin') throw new Error('Unauthorized')
  return payload
}
