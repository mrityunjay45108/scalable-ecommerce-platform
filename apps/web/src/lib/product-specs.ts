export interface ProductSpecs {
  brand?: string;
  material?: string;
  origin?: string;
  care?: string;
  warranty?: string;
  fit?: string;
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
  },
): string {
  const cleanBase = baseDescription ? baseDescription.split('---')[0].trim() : '';
  const specLines: string[] = [];
  if (specs.brand) specLines.push(`Brand: ${specs.brand}`);
  if (specs.material) specLines.push(`Material: ${specs.material}`);
  if (specs.origin) specLines.push(`Country of Origin: ${specs.origin}`);
  if (specs.fit) specLines.push(`Fit / Style: ${specs.fit}`);
  if (specs.care) specLines.push(`Care Instructions: ${specs.care}`);
  if (specs.warranty) specLines.push(`Warranty: ${specs.warranty}`);

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
  const result: ProductSpecs = {
    cleanDescription: description.includes('---') ? description.split('---')[0].trim() : description.trim(),
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

  if (!result.brand) {
    const dLower = description.toLowerCase();
    if (dLower.includes('nike')) result.brand = 'Nike';
    else if (dLower.includes('roadster')) result.brand = 'Roadster';
    else if (dLower.includes('apple')) result.brand = 'Apple';
    else if (dLower.includes('sony')) result.brand = 'Sony';
    else if (dLower.includes('lumina')) result.brand = 'Lumina Studio';
    else result.brand = 'Verified Brand Partner';
  }

  if (!result.material) {
    const cat = (categoryName || '').toLowerCase();
    if (cat.includes('footwear') || cat.includes('shoe')) {
      result.material = 'Engineered Breathable Mesh, Carbon Plate & Nitrogen Foam';
    } else if (cat.includes('apparel') || cat.includes('fashion') || cat.includes('jean') || cat.includes('hoodie')) {
      result.material = '100% Breathable Cotton / Premium Washed Denim';
    } else if (cat.includes('audio') || cat.includes('electron')) {
      result.material = 'Anodized Aluminum Alloy, Memory Foam & Titanium Acoustic Drivers';
    } else if (cat.includes('home') || cat.includes('living')) {
      result.material = 'Precision Articulated Aluminum & Optical Spectrum Glass';
    } else {
      result.material = '100% Certified Premium Material';
    }
  }

  if (!result.origin) {
    result.origin = 'India';
  }

  if (!result.warranty) {
    result.warranty = '1 Year Official Brand Warranty';
  }

  if (!result.care) {
    const cat = (categoryName || '').toLowerCase();
    if (cat.includes('apparel') || cat.includes('fashion')) {
      result.care = 'Machine Wash Cold (30°C) with like colors. Do not bleach.';
    } else if (cat.includes('footwear')) {
      result.care = 'Wipe clean with a damp cloth. Air dry naturally.';
    } else {
      result.care = 'Wipe with a clean dry microfiber cloth.';
    }
  }

  return result;
}