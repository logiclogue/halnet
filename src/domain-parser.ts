import { DomainInfo } from './ai-generator';

export function extractDomainInfo(host: string): DomainInfo {
  const cleanHost = host.replace(/:\d+$/, '');
  
  const parts = cleanHost.split('.');
  
  if (parts.length < 2) {
    return {
      domain: cleanHost,
      keywords: [cleanHost],
      tld: ''
    };
  }

  const tld = parts[parts.length - 1];
  let domain: string;
  let subdomain: string | undefined;

  if (parts.length === 2) {
    domain = parts[0];
  } else {
    domain = parts[parts.length - 2];
    subdomain = parts.slice(0, -2).join('.');
  }

  const keywords = extractKeywords(domain, subdomain);

  return {
    domain,
    subdomain,
    keywords,
    tld
  };
}

function extractKeywords(domain: string, subdomain?: string): string[] {
  const keywords: string[] = [];
  
  keywords.push(...splitCamelCase(domain));
  keywords.push(...splitByDelimiters(domain));
  
  if (subdomain) {
    keywords.push(...splitCamelCase(subdomain));
    keywords.push(...splitByDelimiters(subdomain));
  }
  
  return [...new Set(keywords.filter(k => k.length > 1))];
}

function splitCamelCase(str: string): string[] {
  return str.split(/(?=[A-Z])/).map(s => s.toLowerCase()).filter(s => s.length > 0);
}

function splitByDelimiters(str: string): string[] {
  return str.split(/[-_.]/).filter(s => s.length > 1);
}