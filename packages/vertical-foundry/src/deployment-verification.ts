/**
 * Real Cloudflare End-to-End Verification — proves a deployment is actually
 * live and functional, not just that the deployment API returned success.
 *
 * Verification checks:
 * 1. HTTP availability (status 200 from the deployment URL)
 * 2. Critical application route returns expected content
 * 3. Assets load (CSS, JS)
 * 4. API endpoints respond (where applicable)
 * 5. Authentication boundary (where applicable)
 * 6. Deployment metadata captured
 *
 * A deployment is only marked "verified" after ALL applicable checks pass.
 */

import type { DeploymentProvider, DeploymentInfo } from './provider-contracts.js'

// ── Verification Result ──────────────────────────────────────────────────────

export type VerificationCheckStatus = 'pass' | 'fail' | 'skipped'

export interface VerificationCheck {
  name: string
  status: VerificationCheckStatus
  detail: string
  statusCode?: number
  responseTimeMs?: number
}

export interface DeploymentVerificationResult {
  deploymentId: string
  url: string
  verified: boolean
  checks: VerificationCheck[]
  deploymentMetadata?: DeploymentInfo
  verifiedAt: string
  failedChecks: string[]
}

// ── Verification Configuration ────────────────────────────────────────────────

export interface VerificationConfig {
  /** Expected status codes for the root URL (default: [200]) */
  expectedStatusCodes?: number[]
  /** Critical routes to verify (paths that must return 200) */
  criticalRoutes?: string[]
  /** Expected content patterns in the root page response */
  expectedContentPatterns?: string[]
  /** Asset paths to verify load (CSS/JS) */
  assetPaths?: string[]
  /** API endpoints to verify (paths that should return JSON) */
  apiEndpoints?: string[]
  /** Whether to check authentication boundary */
  checkAuthBoundary?: boolean
  /** Whether to check for expected security headers */
  checkSecurityHeaders?: boolean
  /** Timeout for each HTTP request in ms (default: 10000) */
  requestTimeoutMs?: number
}

// ── Verification Engine ───────────────────────────────────────────────────────

export async function verifyDeployment(
  url: string,
  deploymentProvider: DeploymentProvider,
  deploymentId: string,
  config: VerificationConfig = {},
): Promise<DeploymentVerificationResult> {
  const checks: VerificationCheck[] = []
  const failedChecks: string[] = []
  const timeout = config.requestTimeoutMs ?? 10000

  // Check 1: HTTP availability
  try {
    const start = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    const responseTime = Date.now() - start
    const expectedCodes = config.expectedStatusCodes ?? [200]
    const statusPass = expectedCodes.includes(response.status)

    checks.push({
      name: 'http_availability',
      status: statusPass ? 'pass' : 'fail',
      detail: `Status ${response.status}`,
      statusCode: response.status,
      responseTimeMs: responseTime,
    })
    if (!statusPass) failedChecks.push('http_availability')

    // Check 1b: Expected content patterns
    if (config.expectedContentPatterns && statusPass) {
      try {
        const body = await response.text()
        const allPatternsFound = config.expectedContentPatterns.every((pattern) =>
          body.includes(pattern),
        )
        checks.push({
          name: 'content_patterns',
          status: allPatternsFound ? 'pass' : 'fail',
          detail: allPatternsFound
            ? 'All expected content patterns found'
            : 'Missing expected content patterns',
        })
        if (!allPatternsFound) failedChecks.push('content_patterns')
      } catch {
        checks.push({
          name: 'content_patterns',
          status: 'fail',
          detail: 'Could not read response body',
        })
        failedChecks.push('content_patterns')
      }
    } else if (config.expectedContentPatterns) {
      checks.push({
        name: 'content_patterns',
        status: 'skipped',
        detail: 'Root URL did not return expected status',
      })
    }
  } catch (error) {
    checks.push({
      name: 'http_availability',
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    })
    failedChecks.push('http_availability')
  }

  // Check 2: Critical routes
  if (config.criticalRoutes && config.criticalRoutes.length > 0) {
    for (const route of config.criticalRoutes) {
      try {
        const routeUrl = `${url}${route}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        const response = await fetch(routeUrl, { signal: controller.signal })
        clearTimeout(timeoutId)
        const routePass = response.status >= 200 && response.status < 400
        checks.push({
          name: `route:${route}`,
          status: routePass ? 'pass' : 'fail',
          detail: `Status ${response.status}`,
          statusCode: response.status,
        })
        if (!routePass) failedChecks.push(`route:${route}`)
      } catch (error) {
        checks.push({
          name: `route:${route}`,
          status: 'fail',
          detail: error instanceof Error ? error.message : String(error),
        })
        failedChecks.push(`route:${route}`)
      }
    }
  }

  // Check 3: Assets
  if (config.assetPaths && config.assetPaths.length > 0) {
    for (const asset of config.assetPaths) {
      try {
        const assetUrl = `${url}${asset}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        const response = await fetch(assetUrl, { signal: controller.signal })
        clearTimeout(timeoutId)
        const assetPass = response.status >= 200 && response.status < 400
        checks.push({
          name: `asset:${asset}`,
          status: assetPass ? 'pass' : 'fail',
          detail: `Status ${response.status}`,
          statusCode: response.status,
        })
        if (!assetPass) failedChecks.push(`asset:${asset}`)
      } catch (error) {
        checks.push({
          name: `asset:${asset}`,
          status: 'fail',
          detail: error instanceof Error ? error.message : String(error),
        })
        failedChecks.push(`asset:${asset}`)
      }
    }
  }

  // Check 4: API endpoints
  if (config.apiEndpoints && config.apiEndpoints.length > 0) {
    for (const endpoint of config.apiEndpoints) {
      try {
        const apiUrl = `${url}${endpoint}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        })
        clearTimeout(timeoutId)
        const apiPass = response.status >= 200 && response.status < 400
        let detail = `Status ${response.status}`
        if (apiPass) {
          try {
            const contentType = response.headers.get('content-type') ?? ''
            if (!contentType.includes('json')) {
              detail = 'Response is not JSON'
              checks.push({ name: `api:${endpoint}`, status: 'fail', detail })
              failedChecks.push(`api:${endpoint}`)
              continue
            }
          } catch {
            // Content-type check is best-effort
          }
        }
        checks.push({
          name: `api:${endpoint}`,
          status: apiPass ? 'pass' : 'fail',
          detail,
          statusCode: response.status,
        })
        if (!apiPass) failedChecks.push(`api:${endpoint}`)
      } catch (error) {
        checks.push({
          name: `api:${endpoint}`,
          status: 'fail',
          detail: error instanceof Error ? error.message : String(error),
        })
        failedChecks.push(`api:${endpoint}`)
      }
    }
  }

  // Check 5: Security headers
  if (config.checkSecurityHeaders) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      const expectedHeaders = ['x-content-type-options', 'x-frame-options']
      const missing = expectedHeaders.filter((h) => !response.headers.get(h))
      checks.push({
        name: 'security_headers',
        status: missing.length === 0 ? 'pass' : 'fail',
        detail: missing.length === 0
          ? 'All expected security headers present'
          : `Missing headers: ${missing.join(', ')}`,
      })
      if (missing.length > 0) failedChecks.push('security_headers')
    } catch (error) {
      checks.push({
        name: 'security_headers',
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
      })
      failedChecks.push('security_headers')
    }
  }

  // Check 6: Auth boundary
  if (config.checkAuthBoundary) {
    try {
      // Try accessing a protected route without auth — should get 401/403
      const protectedUrl = `${url}/api/protected`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      const response = await fetch(protectedUrl, { signal: controller.signal })
      clearTimeout(timeoutId)
      const authWorks = response.status === 401 || response.status === 403
      checks.push({
        name: 'auth_boundary',
        status: authWorks ? 'pass' : 'fail',
        detail: authWorks
          ? `Protected route correctly returns ${response.status}`
          : `Protected route returned ${response.status} — auth boundary not enforced`,
        statusCode: response.status,
      })
      if (!authWorks) failedChecks.push('auth_boundary')
    } catch (error) {
      checks.push({
        name: 'auth_boundary',
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
      })
      failedChecks.push('auth_boundary')
    }
  }

  // Check 7: Deployment metadata
  let deploymentMetadata: DeploymentInfo | undefined
  try {
    const status = await deploymentProvider.getDeploymentStatus(deploymentId)
    deploymentMetadata = status
    checks.push({
      name: 'deployment_metadata',
      status: 'pass',
      detail: `Status: ${status.status}, Environment: ${status.environment}`,
    })
  } catch (error) {
    checks.push({
      name: 'deployment_metadata',
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    })
    failedChecks.push('deployment_metadata')
  }

  return {
    deploymentId,
    url,
    verified: failedChecks.length === 0,
    checks,
    ...(deploymentMetadata ? { deploymentMetadata } : {}),
    verifiedAt: new Date().toISOString(),
    failedChecks,
  }
}
