import { AddressIF } from '@bcrs-shared-components/interfaces'
import { RegisteredRecordsAddressesIF } from '@/interfaces/stepper-interfaces/DefineCompany/address-interfaces'
import { RolesIF } from '@/interfaces/stepper-interfaces/AddPeopleAndRole/roles-array-interface'
import { ShareClassIF } from '@/interfaces/stepper-interfaces/CreateShareStructure/create-share-structure-interface'

/**
 * A party as returned by the COLIN snapshot call.
 */
export interface ColinSnapshotPartyIF {
  officer: {
    id?: number
    partyType: string // person | organization
    firstName?: string
    middleInitial?: string
    lastName?: string
    organizationName?: string
    email?: string // always null from the snapshot
  }
  deliveryAddress?: AddressIF
  mailingAddress?: AddressIF
  roles: RolesIF[]
}

/**
 * The data object from the Business API's COLIN snapshot call
 */
export interface ColinSnapshotIF {
  business: {
    identifier: string // prefixed identifier (eg, "BC1234567" or "A0077777")
    legalName: string
    legalType: string // BC | ULC | CC | A
    state: string // ACTIVE | HISTORICAL
    goodStanding?: boolean // tri-state - may be null
    adminFreeze?: boolean
    hasFutureEffectiveFiling?: boolean
    jurisdiction?: string // 'BC' | province code | 'FD' | free text (extraprovincials)
    [key: string]: any
  }
  parties?: ColinSnapshotPartyIF[]
  offices?: RegisteredRecordsAddressesIF
  shareClasses?: ShareClassIF[]
  resolutions?: Array<{ date: string }> // date-only objects (not full ResolutionIF)
}

/**
 * The data object from the COLIN Fetch Public Business call.
 */
export interface ColinBusinessIF {
  businessNumber: string // aka tax id
  corpState: string // not used
  corpStateClass: string // not used
  foundingDate: string // aka incorporation date in BC
  homeCompanyName: string // in foreign jurisdiction
  homeJurisdictionNumber: string // in foreign jurisdiction
  homeRecognitionDate: string // in foreign jurisdiction
  identifier: string // business id in BC
  jurisdiction: string // foreign jurisdiction
  legalName: string // legal name in BC
  legalType: string // may be same as CorpTypeCd
  status: string // not used
}
