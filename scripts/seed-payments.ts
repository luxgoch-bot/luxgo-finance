// Script to seed mock payment data for testing
import { createClient } from '@/lib/supabase-server'

const mockPayments = [
  {
    event_type: 'payment_intent.succeeded',
    amount: 250.00,
    currency: 'CHF',
    status: 'succeeded',
    customer_email: 'customer1@example.com',
    booking_id: 'booking_001',
    stripe_payment_intent_id: 'pi_mock_001',
    stripe_customer_id: 'cus_mock_001',
    stripe_event_id: 'evt_mock_001',
    metadata: {
      description: 'Airport transfer - Zurich to Davos',
      items: [{ name: 'Luxury Transfer', amount: 250.00 }]
    }
  },
  {
    event_type: 'payment_intent.failed',
    amount: 180.50,
    currency: 'CHF',
    status: 'failed',
    customer_email: 'customer2@example.com',
    booking_id: 'booking_002',
    stripe_payment_intent_id: 'pi_mock_002',
    stripe_customer_id: 'cus_mock_002',
    stripe_event_id: 'evt_mock_002',
    metadata: {
      description: 'City tour - Geneva',
      failure_reason: 'card_declined'
    }
  },
  {
    event_type: 'payment_intent.created',
    amount: 320.75,
    currency: 'CHF',
    status: 'pending',
    customer_email: 'customer3@example.com',
    booking_id: 'booking_003',
    stripe_payment_intent_id: 'pi_mock_003',
    stripe_customer_id: 'cus_mock_003',
    stripe_event_id: 'evt_mock_003',
    metadata: {
      description: 'Wedding transportation',
      estimated_duration: '4 hours'
    }
  },
  {
    event_type: 'charge.refunded',
    amount: 150.00,
    currency: 'CHF',
    status: 'succeeded',
    customer_email: 'customer4@example.com',
    booking_id: 'booking_004',
    stripe_payment_intent_id: 'pi_mock_004',
    stripe_customer_id: 'cus_mock_004',
    stripe_event_id: 'evt_mock_004',
    metadata: {
      description: 'Partial refund - Cancelled booking',
      refund_reason: 'customer_request'
    }
  },
  {
    event_type: 'payment_intent.canceled',
    amount: 95.25,
    currency: 'CHF',
    status: 'canceled',
    customer_email: 'customer5@example.com',
    booking_id: 'booking_005',
    stripe_payment_intent_id: 'pi_mock_005',
    stripe_customer_id: 'cus_mock_005',
    stripe_event_id: 'evt_mock_005',
    metadata: {
      description: 'Hotel shuttle',
      cancellation_reason: 'timeout'
    }
  },
  {
    event_type: 'invoice.paid',
    amount: 500.00,
    currency: 'CHF',
    status: 'succeeded',
    customer_email: 'corporate@example.com',
    booking_id: 'booking_006',
    stripe_payment_intent_id: 'pi_mock_006',
    stripe_customer_id: 'cus_mock_006',
    stripe_event_id: 'evt_mock_006',
    metadata: {
      description: 'Monthly corporate account',
      invoice_number: 'INV-2025-03-001'
    }
  },
  {
    event_type: 'customer.subscription.created',
    amount: 299.99,
    currency: 'CHF',
    status: 'succeeded',
    customer_email: 'subscription@example.com',
    booking_id: null,
    stripe_payment_intent_id: 'pi_mock_007',
    stripe_customer_id: 'cus_mock_007',
    stripe_event_id: 'evt_mock_007',
    metadata: {
      description: 'Premium subscription - Monthly',
      plan: 'premium_monthly'
    }
  },
  {
    event_type: 'payment_intent.succeeded',
    amount: 1750.00,
    currency: 'CHF',
    status: 'succeeded',
    customer_email: 'vip@example.com',
    booking_id: 'booking_008',
    stripe_payment_intent_id: 'pi_mock_008',
    stripe_customer_id: 'cus_mock_008',
    stripe_event_id: 'evt_mock_008',
    metadata: {
      description: 'VIP week-long package',
      services: ['Airport transfers', 'City tours', 'Event transportation']
    }
  }
]

async function seedMockPayments() {
  console.log('Starting to seed mock payment data...')
  
  try {
    const supabase = await createClient()
    
    // Get the first profile to associate payments with
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (profileError) {
      throw new Error(`Error fetching profiles: ${profileError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      console.error('No profiles found. Please create a profile first.')
      return
    }

    const profileId = profiles[0].id
    console.log(`Using profile ID: ${profileId}`)

    // Insert mock payments
    const paymentPromises = mockPayments.map((payment, index) => {
      const paymentDate = new Date()
      paymentDate.setDate(paymentDate.getDate() - index * 2) // Stagger dates
      
      return supabase.from('payments').insert({
        profile_id: profileId,
        ...payment,
        created_at: paymentDate.toISOString(),
        updated_at: paymentDate.toISOString()
      })
    })

    const results = await Promise.all(paymentPromises)
    
    let successCount = 0
    let errorCount = 0
    
    results.forEach((result, index) => {
      if (result.error) {
        console.error(`Failed to insert payment ${index + 1}:`, result.error.message)
        errorCount++
      } else {
        successCount++
      }
    })

    console.log(`\nSeeding complete!`)
    console.log(`✅ Successfully inserted: ${successCount} payments`)
    if (errorCount > 0) {
      console.log(`❌ Failed to insert: ${errorCount} payments`)
    }
    
    // Show sample of inserted data
    const { data: insertedPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(3)
    
    console.log('\nSample of inserted payments:')
    insertedPayments?.forEach((payment, index) => {
      console.log(`${index + 1}. ${payment.event_type} - ${payment.customer_email} - ${payment.amount} ${payment.currency}`)
    })

  } catch (error) {
    console.error('Error seeding payments:', error)
  }
}

// Run if this script is executed directly
if (require.main === module) {
  seedMockPayments()
}

export { seedMockPayments }