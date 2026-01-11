import { prisma } from '../config/database';

export interface PricingInfo {
  discount: number;
  urgentCharge: number;
  veryUrgentCharge: number;
  leadTime: {
    normal: number;
    urgent: number;
    veryUrgent: number;
  };
}

/**
 * Find active contract for a customer
 */
export async function findActiveContract(customerId: number) {
  const now = new Date();

  return prisma.contract.findFirst({
    where: {
      customerId,
      trash: null,
      periodFrom: { lte: now },
      periodTo: { gte: now },
    },
    include: {
      details: true,
    },
    orderBy: {
      id: 'desc',
    },
  });
}

/**
 * Get pricing info for a service based on active contract
 */
export async function getServicePricing(
  customerId: number,
  serviceId: number
): Promise<PricingInfo | null> {
  const contract = await findActiveContract(customerId);
  if (!contract) return null;

  return resolvePricing(contract, 'service', serviceId);
}

/**
 * Get pricing info for a package based on active contract
 */
export async function getPackagePricing(
  customerId: number,
  packageId: number
): Promise<PricingInfo | null> {
  const contract = await findActiveContract(customerId);
  if (!contract) return null;

  return resolvePricing(contract, 'package', packageId);
}

/**
 * Batch load pricing for multiple services/packages
 */
export async function getBatchPricing(
  customerId: number,
  serviceIds: number[],
  packageIds: number[]
): Promise<Map<string, PricingInfo>> {
  const contract = await findActiveContract(customerId);
  const result = new Map<string, PricingInfo>();

  if (!contract) return result;

  // Load all relevant details in single query
  const details = await prisma.contractDetail.findMany({
    where: {
      contractId: contract.id,
      OR: [
        ...(serviceIds.length > 0 ? [{ serviceId: { in: serviceIds } }] : []),
        ...(packageIds.length > 0 ? [{ packageId: { in: packageIds } }] : []),
      ],
    },
  });

  const detailMap = new Map(
    details.map((d) => [
      d.serviceId ? `service:${d.serviceId}` : `package:${d.packageId}`,
      d,
    ])
  );

  const basePricing: PricingInfo = {
    discount: contract.discount ?? 0,
    urgentCharge: contract.discountUrgent ?? 50,
    veryUrgentCharge: contract.discountVeryUrgent ?? 100,
    leadTime: {
      normal: contract.normalDay,
      urgent: contract.urgentDay,
      veryUrgent: contract.veryUrgentDay,
    },
  };

  // Resolve each service
  for (const serviceId of serviceIds) {
    const key = `service:${serviceId}`;
    if (contract.statusService === 'selected') {
      const detail = detailMap.get(key);
      if (detail) {
        result.set(key, {
          discount: detail.discountNormal,
          urgentCharge: detail.discountUrgent,
          veryUrgentCharge: detail.discountVeryUrgent,
          leadTime: basePricing.leadTime,
        });
      } else {
        result.set(key, basePricing); // Fallback to global
      }
    } else {
      result.set(key, basePricing);
    }
  }

  // Resolve each package
  for (const packageId of packageIds) {
    const key = `package:${packageId}`;
    if (contract.statusService === 'selected') {
      const detail = detailMap.get(key);
      if (detail) {
        result.set(key, {
          discount: detail.discountNormal,
          urgentCharge: detail.discountUrgent,
          veryUrgentCharge: detail.discountVeryUrgent,
          leadTime: basePricing.leadTime,
        });
      } else {
        result.set(key, basePricing);
      }
    } else {
      result.set(key, basePricing);
    }
  }

  return result;
}

/**
 * Resolve pricing based on contract mode
 */
function resolvePricing(
  contract: any,
  type: 'service' | 'package',
  id: number
): PricingInfo {
  const basePricing: PricingInfo = {
    discount: contract.discount ?? 0,
    urgentCharge: contract.discountUrgent ?? 50,
    veryUrgentCharge: contract.discountVeryUrgent ?? 100,
    leadTime: {
      normal: contract.normalDay,
      urgent: contract.urgentDay,
      veryUrgent: contract.veryUrgentDay,
    },
  };

  if (contract.statusService === 'all') {
    return basePricing;
  }

  // Find specific detail
  const detail = contract.details.find((d: any) =>
    type === 'service' ? d.serviceId === id : d.packageId === id
  );

  if (detail) {
    return {
      discount: detail.discountNormal,
      urgentCharge: detail.discountUrgent,
      veryUrgentCharge: detail.discountVeryUrgent,
      leadTime: basePricing.leadTime,
    };
  }

  return basePricing; // Fallback to global
}

