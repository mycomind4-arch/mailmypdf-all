import { NextResponse } from 'next/server'
import { getAvailableProviders, getDefaultModel } from '@/src/platform/llm-service'

export const runtime = 'nodejs'

export async function GET() {
  const available = getAvailableProviders()
  const allProviders = [
    { id: 'gemini', label: 'Google Gemini', description: 'Fast, efficient analysis (DEFAULT)', available: available.includes('gemini'), model: getDefaultModel('gemini') },
    { id: 'claude', label: 'Anthropic Claude', description: 'Deep reasoning, nuanced drafting', available: available.includes('claude'), model: getDefaultModel('claude') },
    { id: 'openai', label: 'OpenAI GPT-4o', description: 'Versatile, well-rounded', available: available.includes('openai'), model: getDefaultModel('openai') },
  ]
  return NextResponse.json({ providers: allProviders, default: 'gemini' })
}
