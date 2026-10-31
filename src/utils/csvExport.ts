import { BusinessItem, ExecutiveContact } from '../types';

export interface CrawledIndividualContact {
  id: string;
  businessId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  personalEmail?: string | null;
  directPhone?: string | null;
  companyPhone?: string | null;
  companyName: string;
  category: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  website?: string | null;
  linkedInUrl?: string | null;
  emailConfidence?: string | null;
  emailPattern?: string | null;
  backgroundSummary?: string | null;
  sources?: string[];
  crawledAt: string;
}

/**
 * Extracts all individual person contacts from the enriched businesses list
 */
export function extractAllCrawledIndividuals(businesses: BusinessItem[]): CrawledIndividualContact[] {
  const contacts: CrawledIndividualContact[] = [];

  businesses.forEach(b => {
    const exec = b.executiveDetails;
    if (!exec) return;

    const nameParts = (exec.executiveName || 'Executive Officer').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Executive';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Primary executive
    contacts.push({
      id: `${b.id}-exec-primary`,
      businessId: b.id,
      fullName: exec.executiveName || 'Executive Officer',
      firstName,
      lastName,
      jobTitle: exec.executiveTitle || 'Owner / Principal Executive',
      personalEmail: exec.personalEmail || null,
      directPhone: exec.directPhone || null,
      companyPhone: b.phone || null,
      companyName: b.name,
      category: b.category,
      address: b.address,
      city: b.city,
      state: b.state,
      zipcode: b.zipcode,
      country: b.country || 'Worldwide',
      website: b.website || null,
      linkedInUrl: exec.linkedInUrl || null,
      emailConfidence: exec.emailConfidence || (exec.personalEmail ? 'High' : 'None'),
      emailPattern: exec.emailPattern || null,
      backgroundSummary: exec.backgroundSummary || null,
      sources: exec.sources || [],
      crawledAt: exec.crawledAt || new Date().toISOString(),
    });

    // Additional executives if present
    if (exec.additionalExecutives && Array.isArray(exec.additionalExecutives)) {
      exec.additionalExecutives.forEach((addExec, idx) => {
        if (!addExec.name) return;
        const addNameParts = addExec.name.trim().split(/\s+/);
        contacts.push({
          id: `${b.id}-exec-add-${idx}`,
          businessId: b.id,
          fullName: addExec.name,
          firstName: addNameParts[0] || 'Executive',
          lastName: addNameParts.slice(1).join(' ') || '',
          jobTitle: addExec.title || 'Officer',
          personalEmail: addExec.email || null,
          directPhone: addExec.phone || null,
          companyPhone: b.phone || null,
          companyName: b.name,
          category: b.category,
          address: b.address,
          city: b.city,
          state: b.state,
          zipcode: b.zipcode,
          country: b.country || 'Worldwide',
          website: b.website || null,
          linkedInUrl: (addExec as any).linkedInUrl || addExec.linkedIn || null,
          emailConfidence: addExec.email ? 'High' : 'None',
          crawledAt: exec.crawledAt || new Date().toISOString(),
        });
      });
    }
  });

  return contacts;
}

/**
 * Generate standard vCard 3.0 text format for contact address books
 */
export function generateVCardString(contact: CrawledIndividualContact): string {
  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.fullName}`,
    `N:${contact.lastName};${contact.firstName};;;`,
    `ORG:${contact.companyName}`,
    `TITLE:${contact.jobTitle}`,
  ];

  if (contact.personalEmail) {
    vcardLines.push(`EMAIL;TYPE=INTERNET,PREF,WORK:${contact.personalEmail}`);
  }

  if (contact.directPhone) {
    vcardLines.push(`TEL;TYPE=CELL,VOICE,PREF:${contact.directPhone}`);
  }

  if (contact.companyPhone && contact.companyPhone !== contact.directPhone) {
    vcardLines.push(`TEL;TYPE=WORK,VOICE:${contact.companyPhone}`);
  }

  if (contact.website) {
    const cleanUrl = contact.website.startsWith('http') ? contact.website : `https://${contact.website}`;
    vcardLines.push(`URL;TYPE=WORK:${cleanUrl}`);
  }

  if (contact.linkedInUrl) {
    vcardLines.push(`X-SOCIALPROFILE;TYPE=linkedin:${contact.linkedInUrl}`);
  }

  const street = contact.address || '';
  const city = contact.city || '';
  const state = contact.state || '';
  const zip = contact.zipcode || '';
  const country = contact.country || '';
  vcardLines.push(`ADR;TYPE=WORK:;;${street};${city};${state};${zip};${country}`);

  let note = `Deep Crawled via Lead Radar Pro (${new Date(contact.crawledAt).toLocaleDateString()}).`;
  if (contact.backgroundSummary) {
    note += ` Summary: ${contact.backgroundSummary}`;
  }
  if (contact.emailPattern) {
    note += ` Email syntax pattern: ${contact.emailPattern}`;
  }
  vcardLines.push(`NOTE:${note.replace(/\n/g, ' ')}`);

  vcardLines.push('END:VCARD');
  return vcardLines.join('\r\n');
}

/**
 * Export all crawled individuals as a single multi-entry vCard (.vcf) file
 * Compatible with Apple Contacts, Google Contacts, Microsoft Outlook, Android, iOS.
 */
export function exportIndividualsToVCF(
  individuals: CrawledIndividualContact[], 
  filename = 'crawled_executive_contacts.vcf'
) {
  if (individuals.length === 0) return;
  const vcards = individuals.map(generateVCardString).join('\r\n\r\n');
  const blob = new Blob([vcards], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export a single individual contact as .vcf
 */
export function exportSingleIndividualToVCF(contact: CrawledIndividualContact) {
  const safeName = contact.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'contact';
  exportIndividualsToVCF([contact], `${safeName}_contact.vcf`);
}

/**
 * Export deep crawled individuals to clean contact book CSV
 */
export function exportIndividualsToCSV(
  individuals: CrawledIndividualContact[],
  filename = 'crawled_individuals_contact_book.csv'
) {
  const headers = [
    'Full Name',
    'First Name',
    'Last Name',
    'Job Title',
    'Direct Personal Email',
    'Email Confidence',
    'Direct Phone',
    'Company Name',
    'Industry / Category',
    'Company Phone',
    'Address',
    'City',
    'State / Region',
    'Postal Code',
    'Country',
    'Website',
    'LinkedIn Profile',
    'Email Syntax Pattern',
    'Background Summary',
    'Sources',
    'Crawled Date'
  ];

  const rows = individuals.map(ind => [
    `"${(ind.fullName || '').replace(/"/g, '""')}"`,
    `"${(ind.firstName || '').replace(/"/g, '""')}"`,
    `"${(ind.lastName || '').replace(/"/g, '""')}"`,
    `"${(ind.jobTitle || '').replace(/"/g, '""')}"`,
    `"${(ind.personalEmail || '').replace(/"/g, '""')}"`,
    `"${(ind.emailConfidence || '').replace(/"/g, '""')}"`,
    `"${(ind.directPhone || '').replace(/"/g, '""')}"`,
    `"${(ind.companyName || '').replace(/"/g, '""')}"`,
    `"${(ind.category || '').replace(/"/g, '""')}"`,
    `"${(ind.companyPhone || '').replace(/"/g, '""')}"`,
    `"${(ind.address || '').replace(/"/g, '""')}"`,
    `"${(ind.city || '').replace(/"/g, '""')}"`,
    `"${(ind.state || '').replace(/"/g, '""')}"`,
    `"${(ind.zipcode || '').replace(/"/g, '""')}"`,
    `"${(ind.country || '').replace(/"/g, '""')}"`,
    `"${(ind.website || '').replace(/"/g, '""')}"`,
    `"${(ind.linkedInUrl || '').replace(/"/g, '""')}"`,
    `"${(ind.emailPattern || '').replace(/"/g, '""')}"`,
    `"${(ind.backgroundSummary || '').replace(/"/g, '""')}"`,
    `"${(ind.sources?.join('; ') || '').replace(/"/g, '""')}"`,
    `"${ind.crawledAt}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(businesses: BusinessItem[], filename = 'leadradar_executive_contacts.csv') {
  const headers = [
    'Business Name',
    'Category',
    'Country',
    'Address',
    'City',
    'State / Region',
    'Postal Code / Zip',
    'Main Phone',
    'Website',
    'Rating',
    'Review Count',
    'Enrichment Status',
    'Executive Name',
    'Executive Title',
    'Personal Email (Strict Filtered)',
    'Email Confidence',
    'Email Pattern',
    'Direct Executive Phone',
    'Phone Type',
    'LinkedIn Profile',
    'Sources',
    'Executive Notes'
  ];

  const rows = businesses.map(b => {
    const exec = b.executiveDetails;
    return [
      `"${(b.name || '').replace(/"/g, '""')}"`,
      `"${(b.category || '').replace(/"/g, '""')}"`,
      `"${(b.country || '').replace(/"/g, '""')}"`,
      `"${(b.address || '').replace(/"/g, '""')}"`,
      `"${(b.city || '').replace(/"/g, '""')}"`,
      `"${(b.state || '').replace(/"/g, '""')}"`,
      `"${(b.zipcode || '').replace(/"/g, '""')}"`,
      `"${(b.phone || '').replace(/"/g, '""')}"`,
      `"${(b.website || '').replace(/"/g, '""')}"`,
      b.rating ?? '',
      b.reviewCount ?? '',
      `"${b.enrichmentStatus}"`,
      `"${(exec?.executiveName || '').replace(/"/g, '""')}"`,
      `"${(exec?.executiveTitle || '').replace(/"/g, '""')}"`,
      `"${(exec?.personalEmail || '').replace(/"/g, '""')}"`,
      `"${(exec?.emailConfidence || '').replace(/"/g, '""')}"`,
      `"${(exec?.emailPattern || '').replace(/"/g, '""')}"`,
      `"${(exec?.directPhone || '').replace(/"/g, '""')}"`,
      `"${(exec?.phoneType || '').replace(/"/g, '""')}"`,
      `"${(exec?.linkedInUrl || '').replace(/"/g, '""')}"`,
      `"${(exec?.sources?.join('; ') || '').replace(/"/g, '""')}"`,
      `"${(exec?.backgroundSummary || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJSON(businesses: BusinessItem[], filename = 'leadradar_executive_contacts.json') {
  const jsonContent = JSON.stringify(businesses, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

