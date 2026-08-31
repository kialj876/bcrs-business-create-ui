import { AreOfficesComplete, AreOrgPersonsComplete, IsAddressValid, IsOrgPersonComplete,
  IsShareStructureComplete } from '@/utils'
import { OfficeAddressSchema, PersonAddressSchema } from '@/schemas'

const VALID_BC_ADDRESS: any = {
  streetAddress: '123 Main St',
  streetAddressAdditional: '',
  addressCity: 'Victoria',
  addressRegion: 'BC',
  addressCountry: 'CA',
  postalCode: 'V8V 8V8',
  deliveryInstructions: ''
}

const VALID_DIRECTOR: any = {
  officer: { partyType: 'person', firstName: 'JANE', lastName: 'DOE' },
  mailingAddress: { ...VALID_BC_ADDRESS },
  deliveryAddress: { ...VALID_BC_ADDRESS },
  roles: [{ roleType: 'Director', appointmentDate: '2010-05-05' }]
}

const VALID_OFFICES: any = {
  registeredOffice: {
    mailingAddress: { ...VALID_BC_ADDRESS },
    deliveryAddress: { ...VALID_BC_ADDRESS }
  },
  recordsOffice: {
    mailingAddress: { ...VALID_BC_ADDRESS },
    deliveryAddress: { ...VALID_BC_ADDRESS }
  }
}

describe('IsAddressValid', () => {
  it('accepts a complete person address', () => {
    expect(IsAddressValid(VALID_BC_ADDRESS, PersonAddressSchema)).toBe(true)
  })

  it('rejects a nullish address', () => {
    expect(IsAddressValid(null, PersonAddressSchema)).toBe(false)
    expect(IsAddressValid(undefined, OfficeAddressSchema)).toBe(false)
  })

  it('rejects a missing or empty street address', () => {
    expect(IsAddressValid({ ...VALID_BC_ADDRESS, streetAddress: '' }, PersonAddressSchema)).toBe(false)
    expect(IsAddressValid({ ...VALID_BC_ADDRESS, streetAddress: null }, PersonAddressSchema)).toBe(false)
  })

  it('rejects a missing city or country', () => {
    expect(IsAddressValid({ ...VALID_BC_ADDRESS, addressCity: '' }, PersonAddressSchema)).toBe(false)
    expect(IsAddressValid({ ...VALID_BC_ADDRESS, addressCountry: '' }, PersonAddressSchema)).toBe(false)
  })

  it('rejects a missing or malformed Canadian postal code', () => {
    expect(IsAddressValid({ ...VALID_BC_ADDRESS, postalCode: '' }, PersonAddressSchema)).toBe(false)
    expect(IsAddressValid({ ...VALID_BC_ADDRESS, postalCode: '12345' }, PersonAddressSchema)).toBe(false)
  })

  it('applies office-only rules (must be in BC, Canada)', () => {
    expect(IsAddressValid({ ...VALID_BC_ADDRESS, addressCountry: 'US', addressRegion: 'WA', postalCode: '98101' },
      OfficeAddressSchema)).toBe(false)
    expect(IsAddressValid({ ...VALID_BC_ADDRESS, addressRegion: 'ON' }, OfficeAddressSchema)).toBe(false)
    // but a person may be anywhere
    expect(IsAddressValid({ ...VALID_BC_ADDRESS, addressCountry: 'US', addressRegion: 'WA', postalCode: '98101' },
      PersonAddressSchema)).toBe(true)
  })
})

describe('IsOrgPersonComplete / AreOrgPersonsComplete', () => {
  it('accepts a complete director', () => {
    expect(IsOrgPersonComplete(VALID_DIRECTOR)).toBe(true)
  })

  it('rejects a person with a missing or blank first or last name', () => {
    expect(IsOrgPersonComplete({
      ...VALID_DIRECTOR, officer: { partyType: 'person', firstName: '', lastName: 'DOE' }
    })).toBe(false)
    expect(IsOrgPersonComplete({
      ...VALID_DIRECTOR, officer: { partyType: 'person', lastName: 'DOE' }
    })).toBe(false)
    expect(IsOrgPersonComplete({
      ...VALID_DIRECTOR, officer: { partyType: 'person', firstName: 'JANE', lastName: '  ' }
    })).toBe(false)
  })

  it('requires an organization name for orgs but not person names', () => {
    const org = {
      ...VALID_DIRECTOR,
      officer: { partyType: 'organization', organizationName: 'ACME LTD' },
      roles: [{ roleType: 'Incorporator' }]
    }
    expect(IsOrgPersonComplete(org)).toBe(true)
    expect(IsOrgPersonComplete({
      ...org, officer: { partyType: 'organization', organizationName: '' }
    })).toBe(false)
  })

  it('rejects a director with an incomplete delivery address', () => {
    expect(IsOrgPersonComplete({
      ...VALID_DIRECTOR,
      deliveryAddress: { ...VALID_BC_ADDRESS, streetAddress: '' }
    })).toBe(false)
    expect(IsOrgPersonComplete({ ...VALID_DIRECTOR, deliveryAddress: null })).toBe(false)
  })

  it('does not require a delivery address for non-director roles', () => {
    const completingParty = {
      ...VALID_DIRECTOR,
      deliveryAddress: undefined,
      roles: [{ roleType: 'Completing Party' }]
    }
    expect(IsOrgPersonComplete(completingParty)).toBe(true)
  })

  it('rejects a person with an incomplete mailing address', () => {
    expect(IsOrgPersonComplete({
      ...VALID_DIRECTOR,
      mailingAddress: { ...VALID_BC_ADDRESS, addressCity: '' }
    })).toBe(false)
  })

  it('validates the whole list (empty list is valid)', () => {
    expect(AreOrgPersonsComplete([])).toBe(true)
    expect(AreOrgPersonsComplete(null)).toBe(true)
    expect(AreOrgPersonsComplete([VALID_DIRECTOR])).toBe(true)
    expect(AreOrgPersonsComplete([
      VALID_DIRECTOR,
      { ...VALID_DIRECTOR, officer: { partyType: 'person', firstName: '', lastName: 'DOE' } }
    ])).toBe(false)
  })
})

describe('AreOfficesComplete', () => {
  it('accepts complete registered and records offices', () => {
    expect(AreOfficesComplete(VALID_OFFICES)).toBe(true)
  })

  it('rejects nullish or missing offices', () => {
    expect(AreOfficesComplete(null)).toBe(false)
    expect(AreOfficesComplete({ registeredOffice: VALID_OFFICES.registeredOffice } as any)).toBe(false)
  })

  it('rejects an office with an incomplete address', () => {
    expect(AreOfficesComplete({
      ...VALID_OFFICES,
      recordsOffice: {
        mailingAddress: { ...VALID_BC_ADDRESS, streetAddress: '' },
        deliveryAddress: { ...VALID_BC_ADDRESS }
      }
    })).toBe(false)
  })
})

describe('IsShareStructureComplete', () => {
  const validClass: any = {
    name: 'Class A Shares',
    hasMaximumShares: true,
    maxNumberOfShares: 10000,
    hasParValue: true,
    parValue: 1.5,
    currency: 'CAD',
    series: [{
      name: 'Series 1',
      hasMaximumShares: false,
      maxNumberOfShares: null
    }]
  }

  it('accepts a complete share structure', () => {
    expect(IsShareStructureComplete([validClass])).toBe(true)
  })

  it('rejects an empty or nullish share structure', () => {
    expect(IsShareStructureComplete([])).toBe(false)
    expect(IsShareStructureComplete(null)).toBe(false)
  })

  it('rejects a class with a blank name', () => {
    expect(IsShareStructureComplete([{ ...validClass, name: '' }])).toBe(false)
  })

  it('rejects a missing maximum when the class has one', () => {
    expect(IsShareStructureComplete([{ ...validClass, maxNumberOfShares: null }])).toBe(false)
    // no maximum means no count is needed
    expect(IsShareStructureComplete([{ ...validClass, hasMaximumShares: false, maxNumberOfShares: null }]))
      .toBe(true)
  })

  it('rejects par value classes missing the par value or currency', () => {
    expect(IsShareStructureComplete([{ ...validClass, parValue: null }])).toBe(false)
    expect(IsShareStructureComplete([{ ...validClass, currency: null }])).toBe(false)
    // no par value means neither is needed
    expect(IsShareStructureComplete([{ ...validClass, hasParValue: false, parValue: null, currency: null }]))
      .toBe(true)
  })

  it('validates series too', () => {
    expect(IsShareStructureComplete([{
      ...validClass,
      series: [{ name: '', hasMaximumShares: false }]
    }])).toBe(false)
  })
})
