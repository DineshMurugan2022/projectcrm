// Official B & Y Technologies Agency Designations
export const AGENCY_DESIGNATIONS = [
  "Managing Director",
  "General Manager",
  "HR",
  "Tech Team Manager",
  "Sr BDM",
  "BDM",
  "BDE",
  "Team Leader (Telecaller)",
  "Process Associate",
  "FullStack Developer",
  "UI/UX Developer",
  "Sr SEO Analyst",
  "SEO Analyst",
  "Customer Support",
] as const;

export type AgencyDesignation = (typeof AGENCY_DESIGNATIONS)[number];

// Department mapping suggestions for each designation
export const DESIGNATION_DEPARTMENT_MAP: Record<AgencyDesignation, string> = {
  "Managing Director": "Executive Leadership",
  "General Manager": "Operations & Management",
  "HR": "People Operations & HR",
  "Tech Team Manager": "Web & Tech Engineering",
  "Sr BDM": "Business Development & Sales",
  "BDM": "Business Development & Sales",
  "BDE": "Business Development & Sales",
  "Team Leader (Telecaller)": "Client Outreach & Telecalling",
  "Process Associate": "Client Outreach & Telecalling",
  "FullStack Developer": "Web & Tech Engineering",
  "UI/UX Developer": "Creative Studio",
  "Sr SEO Analyst": "SEO & Organic Growth",
  "SEO Analyst": "SEO & Organic Growth",
  "Customer Support": "Customer Support & Success",
};
