export interface CustomSpec {
  key: string;
  value: string;
}

export interface ProductSpecs {
  brand?: string;
  material?: string;
  origin?: string;
  care?: string;
  warranty?: string;
  fit?: string;
  customSpecs?: CustomSpec[];
  cleanDescription: string;
}

export function formatDescriptionWithSpecs(
  baseDescription: string,
  specs: {
    brand?: string;
    material?: string;
    origin?: string;
    care?: string;
    warranty?: string;
    fit?: string;
    customSpecs?: CustomSpec[];
  },
): string {
  const cleanBase = baseDescription ? baseDescription.split('---')[0].trim() : '';
  const specLines: string[] = [];

  if (specs.brand?.trim()) specLines.push(`Brand: ${specs.brand.trim()}`);
  if (specs.material?.trim()) specLines.push(`Material: ${specs.material.trim()}`);
  if (specs.origin?.trim()) specLines.push(`Country of Origin: ${specs.origin.trim()}`);
  if (specs.fit?.trim()) specLines.push(`Fit / Style: ${specs.fit.trim()}`);
  if (specs.care?.trim()) specLines.push(`Care Instructions: ${specs.care.trim()}`);
  if (specs.warranty?.trim()) specLines.push(`Warranty: ${specs.warranty.trim()}`);

  if (specs.customSpecs && Array.isArray(specs.customSpecs)) {
    for (const cs of specs.customSpecs) {
      if (cs.key?.trim() && cs.value?.trim()) {
        specLines.push(`${cs.key.trim()}: ${cs.value.trim()}`);
      }
    }
  }

  if (specLines.length === 0) return cleanBase;

  const formatted = specLines
    .map((l) => {
      const parts = l.split(':');
      return `- **${parts[0].trim()}**: ${parts.slice(1).join(':').trim()}`;
    })
    .join('\n');

  return `${cleanBase}\n\n---\n### Specifications & Materials\n${formatted}`;
}

export function parseProductSpecs(description: string, categoryName?: string): ProductSpecs {
  const cleanDescription = description.includes('---') ? description.split('---')[0].trim() : description.trim();
  const result: ProductSpecs = {
    cleanDescription,
    customSpecs: [],
  };

  const brandMatch = description.match(/(?:Brand|Company|Manufacturer|Made By)[\s*:]+([^\n\-*]+)/i);
  if (brandMatch) result.brand = brandMatch[1].trim().replace(/^\*+|\*+$/g, '');

  const materialMatch = description.match(/(?:Material|Fabric|Composition|Crafted From)[\s*:]+([^\n\-*]+)/i);
  if (materialMatch) result.material = materialMatch[1].trim().replace(/^\*+|\*+$/g, '');

  const originMatch = description.match(/(?:Country of Origin|Made in|Origin)[\s*:]+([^\n\-*]+)/i);
  if (originMatch) result.origin = originMatch[1].trim().replace(/^\*+|\*+$/g, '');

  const fitMatch = description.match(/(?:Fit|Style|Silhouette)[\s*:]+([^\n\-*]+)/i);
  if (fitMatch) result.fit = fitMatch[1].trim().replace(/^\*+|\*+$/g, '');

  const careMatch = description.match(/(?:Care Instructions|Care|Wash Care)[\s*:]+([^\n\-*]+)/i);
  if (careMatch) result.care = careMatch[1].trim().replace(/^\*+|\*+$/g, '');

  const warrantyMatch = description.match(/(?:Warranty|Guarantee)[\s*:]+([^\n\-*]+)/i);
  if (warrantyMatch) result.warranty = warrantyMatch[1].trim().replace(/^\*+|\*+$/g, '');

  // Extract custom specification lines after ---
  if (description.includes('---')) {
    const specsSection = description.split('---')[1];
    const lines = specsSection.split('\n');
    const knownKeys = ['brand', 'company', 'manufacturer', 'material', 'fabric', 'country of origin', 'made in', 'origin', 'fit', 'fit / style', 'care', 'care instructions', 'wash care', 'warranty', 'guarantee'];

    for (const line of lines) {
      const match = line.match(/^\s*-\s*\*\*([^*]+)\*\*:\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!knownKeys.includes(key.toLowerCase())) {
          result.customSpecs?.push({ key, value });
        }
      }
    }
  }

  return result;
}