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
  const { payload } = await jwtVerify(token, secret())
  return payload
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}
