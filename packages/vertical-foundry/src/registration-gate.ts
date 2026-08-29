export interface RegistrationRequest { verticalId: string; previewUrl: string; verified: boolean }
export interface EcosystemRegistryAdapter { register(request: RegistrationRequest): Promise<{ registered: boolean; verticalId: string }> }

export async function registerVerifiedVertical(adapter: EcosystemRegistryAdapter, request: RegistrationRequest) {
  if (!request.verified) throw new Error('Vertical must be verified before ecosystem registration')
  return adapter.register(request)
}
