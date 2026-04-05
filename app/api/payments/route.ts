import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Get the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get profiles for this user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)

  if (!profiles?.length) {
    return new Response('No profiles found', { status: 404 })
  }

  const profileIds = profiles.map((p) => p.id)

  try {
    // Fetch payment events from the database
    const { data: payments, error } = await supabase
      .from('payments') // This table will be created in the next step
      .select('*')
      .in('profile_id', profileIds)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}