import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

// This uses the service role key on the server only — never exposed to the browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return Response.json({ error: 'Missing orderId' }, { status: 400 })
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.review_email_sent) {
      return Response.json({ message: 'Review email already sent' }, { status: 200 })
    }

    // Get the customer's email
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id)
    const customerEmail = userData?.user?.email

    if (!customerEmail) {
      return Response.json({ error: 'Customer email not found' }, { status: 404 })
    }

    // Build a simple list of items with review links
    const itemsHtml = (order.items || [])
      .map(item => `
        <li style="margin-bottom: 12px;">
          <strong>${item.name}</strong><br/>
          <a href="${process.env.NEXT_PUBLIC_CUSTOMER_APP_URL}/review/${order.id}"
             style="color: #f59b1e; font-weight: bold;">
            Leave a review
          </a>
        </li>
      `)
      .join('')

    await resend.emails.send({
      from: 'Banfos <orders@banfos.com>',
      to: customerEmail,
      subject: 'How was your Banfos order?',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1a0a00;">We'd love your feedback!</h2>
          <p style="color: #555;">Your order has been delivered. Let us know what you think of your new bag:</p>
          <ul style="list-style: none; padding: 0;">
            ${itemsHtml}
          </ul>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Thank you for shopping with Banfos.
          </p>
        </div>
      `,
    })

    // Mark as sent so we don't email them twice
    await supabaseAdmin
      .from('orders')
      .update({ review_email_sent: true })
      .eq('id', orderId)

    return Response.json({ success: true })
  } catch (err) {
    console.error('Send review email error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}