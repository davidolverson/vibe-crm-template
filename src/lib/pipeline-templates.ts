/**
 * Pipeline templates for vertically-integrated operators.
 *
 * The MOAT: no RE-only competitor ships Mortgage / Insurance / Investment
 * pipelines alongside Real Estate. These encode the actual workflow each
 * line of business runs, not a generic "contact → deal → close" funnel.
 */

export type PipelineKind = 'real_estate' | 'mortgage' | 'insurance' | 'investment';

export interface PipelineTemplate {
  key: PipelineKind;
  name: string;
  description: string;
  stages: ReadonlyArray<{ name: string; position: number }>;
}

export const REAL_ESTATE_TEMPLATE: PipelineTemplate = {
  key: 'real_estate',
  name: 'Real Estate',
  description: 'Buyer and seller transactions from lead through closing.',
  stages: [
    { name: 'New Lead', position: 0 },
    { name: 'Contacted', position: 1 },
    { name: 'Qualifying', position: 2 },
    { name: 'Showing / Meeting', position: 3 },
    { name: 'Offer Made', position: 4 },
    { name: 'Under Contract', position: 5 },
    { name: 'Closed Won', position: 6 },
    { name: 'Closed Lost', position: 7 },
  ],
};

export const MORTGAGE_TEMPLATE: PipelineTemplate = {
  key: 'mortgage',
  name: 'Mortgage',
  description: 'Loan origination from application through funded.',
  stages: [
    { name: 'Inquiry', position: 0 },
    { name: 'Pre-Qualified', position: 1 },
    { name: 'Application Submitted', position: 2 },
    { name: 'Disclosures Sent', position: 3 },
    { name: 'Processing', position: 4 },
    { name: 'Underwriting', position: 5 },
    { name: 'Conditional Approval', position: 6 },
    { name: 'Clear to Close', position: 7 },
    { name: 'Funded', position: 8 },
    { name: 'Declined / Withdrawn', position: 9 },
  ],
};

export const INSURANCE_TEMPLATE: PipelineTemplate = {
  key: 'insurance',
  name: 'Insurance',
  description: 'Policy lifecycle from quote through renewal.',
  stages: [
    { name: 'Quote Requested', position: 0 },
    { name: 'Quoted', position: 1 },
    { name: 'Application Signed', position: 2 },
    { name: 'Underwriting', position: 3 },
    { name: 'Bound', position: 4 },
    { name: 'Active Policy', position: 5 },
    { name: 'Renewal Review (60d)', position: 6 },
    { name: 'Lapsed', position: 7 },
  ],
};

export const INVESTMENT_TEMPLATE: PipelineTemplate = {
  key: 'investment',
  name: 'Investment',
  description: 'Investor acquisitions and hold properties.',
  stages: [
    { name: 'Sourcing', position: 0 },
    { name: 'Under Analysis', position: 1 },
    { name: 'LOI Sent', position: 2 },
    { name: 'Under Contract', position: 3 },
    { name: 'Due Diligence', position: 4 },
    { name: 'Closed / Acquired', position: 5 },
    { name: 'Rehab / Reposition', position: 6 },
    { name: 'Held / Cashflowing', position: 7 },
    { name: 'Exited / Sold', position: 8 },
  ],
};

export const ALL_TEMPLATES: PipelineTemplate[] = [
  REAL_ESTATE_TEMPLATE,
  MORTGAGE_TEMPLATE,
  INSURANCE_TEMPLATE,
  INVESTMENT_TEMPLATE,
];

export function getTemplate(kind: PipelineKind): PipelineTemplate {
  const t = ALL_TEMPLATES.find((tpl) => tpl.key === kind);
  if (!t) throw new Error(`Unknown pipeline template: ${kind}`);
  return t;
}
