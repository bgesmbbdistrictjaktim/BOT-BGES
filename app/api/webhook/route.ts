import { NextRequest, NextResponse } from 'next/server'
import botModule from '@/app/bot.js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token') || request.headers.get('x-webhook-secret')
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET
    const enforceSecret = process.env.ENFORCE_WEBHOOK_SECRET !== 'false'

    if (expectedSecret) {
      const isMatch = incomingSecret === expectedSecret
      console.log('Webhook secret check', { hasIncoming: !!incomingSecret, isMatch, enforceSecret })
      if (enforceSecret && !isMatch) {
        // Secret mismatch; acknowledge without processing
        return NextResponse.json({ ok: true })
      }
    }

    console.log('Incoming update summary', {
      hasMessage: !!body?.message,
      text: body?.message?.text,
      hasCallback: !!body?.callback_query,
      callbackData: body?.callback_query?.data
    })

    const bot: any = (botModule as any).bot || (botModule as any)
    if (bot && typeof bot.processUpdate === 'function') {
      bot.processUpdate(body)
    } else {
      console.error('Bot instance not available or invalid')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Bot is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
}