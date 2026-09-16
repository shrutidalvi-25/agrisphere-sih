import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const AuthContext = createContext(undefined)

// Wraps the whole app. Tracks the logged-in Supabase user AND their row in
// the `profiles` table (which holds the role: farmer / buyer / fpo / admin).
// Every screen that needs to know "who is logged in" and "what can they see"
// reads from this context instead of calling Supabase directly.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, isRetry = false) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // Right after signup there's a brief window before the
      // handle_new_user trigger (02_handle_new_user_trigger.sql) commits
      // the profiles row — a fetch that lands in that window fails even
      // though the account is legitimate. One retry after a short delay
      // covers that race without falsely signing out a brand-new user.
      if (!isRetry) {
        await new Promise((resolve) => setTimeout(resolve, 800))
        return fetchProfile(userId, true)
      }

      console.error('Could not load profile:', error.message)
      // A session with no matching profile row is unusable — every
      // ProtectedRoute redirects an unrecognized role back to "/", which
      // itself requires a role, so without this the app gets stuck in an
      // infinite redirect loop (permanently blank page, no way out except
      // clearing browser storage by hand). Signing out clears the stale
      // session and drops the user back at the login screen instead.
      await supabase.auth.signOut()
      setProfile(null)
      setLoading(false)
      return
    }

    setProfile(data)
    setLoading(false)
  }

  async function signUp({ email, password, name, phone, role, farmerIdNumber, aadhaarId }) {
    // name/phone/role/farmerIdNumber/aadhaarId travel as user metadata; a
    // database trigger (supabase/02_handle_new_user_trigger.sql, extended by
    // supabase/16_farmer_kyc.sql) reads it and creates the profiles row (and,
    // for farmers, the farmer_kyc row) server-side — no client-side insert,
    // no RLS timing issues.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone, role, farmerIdNumber, aadhaarId } },
    })
    if (error) return { error }

    // If email confirmation is still on, Supabase returns a user but no
    // session yet — the caller needs to know to show "check your email"
    // instead of treating this as a normal logged-in signup.
    return { data, needsEmailConfirmation: !data.session }
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
