import { createClient, type Session, type User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined
const key=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined
export const supabase=url&&key?createClient(url,key):null
export type AuthState={user:User|null;session:Session|null;accessToken:string|null;loading:boolean}
const C=createContext<AuthState>({user:null,session:null,accessToken:null,loading:true})
export function AuthProvider({children}:{children:ReactNode}){const[session,setSession]=useState<Session|null>(null);const[loading,setLoading]=useState(true);useEffect(()=>{if(!supabase){setLoading(false);return}let active=true;supabase.auth.getSession().then(({data})=>{if(active)setSession(data.session);setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>{active=false;subscription.unsubscribe()}} ,[]);return <C.Provider value={{user:session?.user??null,session,accessToken:session?.access_token??null,loading}}>{children}</C.Provider>}
export const useAuth=()=>useContext(C)
