import type { MetadataRoute } from 'next'
import { workflows } from './workflows/workflow-data'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://records.mailmypdf.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/workflows`, changeFrequency: 'weekly', priority: 0.9 },
    ...workflows.map(workflow => ({
      url: `${baseUrl}/workflows/${workflow.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
