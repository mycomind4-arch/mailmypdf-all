import { createStart, createMiddleware } from '@tanstack/react-start'
const security=createMiddleware().server(async({next})=>{const r=await next();if(r instanceof Response){r.headers.set('X-Content-Type-Options','nosniff');r.headers.set('X-Frame-Options','DENY');r.headers.set('Referrer-Policy','strict-origin-when-cross-origin')}return r})
export const startInstance=createStart(()=>({requestMiddleware:[security]}))
