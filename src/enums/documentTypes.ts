/**
 * Document types accepted by the Legal API client document (DRS) endpoint:
 * POST documents/client/{filingType}/{entityType}/{documentType}
 */
export enum DocumentTypes {
  AFFIDAVIT = 'affidavit',
  AUTHORIZATION_FILE = 'authorization_file',
  COOP_MEMORANDUM = 'coop_memorandum',
  COOP_RULES = 'coop_rules',
  DIRECTOR_AFFIDAVIT = 'director_affidavit'
}
