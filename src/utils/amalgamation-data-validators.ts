import { AddressIF } from '@bcrs-shared-components/interfaces'
import { AddressSchemaIF, OrgPersonIF, RegisteredRecordsAddressesIF, ShareClassIF }
  from '@/interfaces'
import { OfficeAddressSchema, PersonAddressSchema } from '@/schemas'
import { PartyTypes, RoleTypes } from '@/enums'

/**
 * Validators for amalgamation data that was prepopulated (from the holding/primary
 * business or a COLIN snapshot) or restored from a draft, and therefore never passed
 * through the add/edit forms that normally enforce these rules.
 */

/**
 * Whether the address satisfies every rule in the subject Vuelidate schema.
 * NB - Vuelidate validators are plain (value, parentVm) functions, so they can be
 *      evaluated directly against the address object.
 * @param address the address to validate (invalid if nullish)
 * @param schema the Vuelidate schema to validate against
 */
export function IsAddressValid (address: AddressIF, schema: AddressSchemaIF): boolean {
  if (!address) return false
  return Object.keys(schema).every(field =>
    Object.values(schema[field]).every(
      (rule: (value: any, parentVm: any) => boolean) => !!rule(address[field], address)
    )
  )
}

/**
 * Whether the org-person has the names and addresses the filing requires.
 * @param orgPerson the org-person to validate
 */
export function IsOrgPersonComplete (orgPerson: OrgPersonIF): boolean {
  const officer = orgPerson?.officer
  if (!officer) return false

  // check names
  if (officer.partyType === PartyTypes.ORGANIZATION) {
    if (!officer.organizationName?.trim()) return false
  } else {
    if (!officer.firstName?.trim() || !officer.lastName?.trim()) return false
  }

  // check mailing address
  if (!IsAddressValid(orgPerson.mailingAddress, PersonAddressSchema)) return false

  // directors, proprietors and partners also require a complete delivery address
  const requiresDeliveryAddress = orgPerson.roles?.some(role =>
    [RoleTypes.DIRECTOR, RoleTypes.PROPRIETOR, RoleTypes.PARTNER].includes(role.roleType)
  )
  if (requiresDeliveryAddress && !IsAddressValid(orgPerson.deliveryAddress, PersonAddressSchema)) {
    return false
  }

  return true
}

/**
 * Whether every org-person in the list is complete.
 * @param orgPeople the org-person list to validate (an empty list is valid)
 */
export function AreOrgPersonsComplete (orgPeople: OrgPersonIF[]): boolean {
  return (orgPeople || []).every(orgPerson => IsOrgPersonComplete(orgPerson))
}

/**
 * Whether the registered and records office addresses are complete.
 * @param addresses the office addresses to validate
 */
export function AreOfficesComplete (addresses: RegisteredRecordsAddressesIF): boolean {
  return (
    IsAddressValid(addresses?.registeredOffice?.mailingAddress, OfficeAddressSchema) &&
    IsAddressValid(addresses?.registeredOffice?.deliveryAddress, OfficeAddressSchema) &&
    IsAddressValid(addresses?.recordsOffice?.mailingAddress, OfficeAddressSchema) &&
    IsAddressValid(addresses?.recordsOffice?.deliveryAddress, OfficeAddressSchema)
  )
}

/**
 * Whether the share structure is non-empty and each class/series has its required data.
 * NB - deliberately minimal: currency values are not validated against a list since
 *      legacy COLIN shares may carry the grandfathered "OTHER" currency.
 * @param shareClasses the share classes (and their series) to validate
 */
export function IsShareStructureComplete (shareClasses: ShareClassIF[]): boolean {
  if (!shareClasses?.length) return false

  const isShareComplete = (share: any): boolean => {
    if (!share.name?.trim()) return false
    if (share.hasMaximumShares && !(+share.maxNumberOfShares > 0)) return false
    if (share.hasParValue && (!(+share.parValue > 0) || !share.currency)) return false
    return true
  }

  return shareClasses.every(shareClass =>
    isShareComplete(shareClass) &&
    (shareClass.series || []).every(series => isShareComplete(series))
  )
}
