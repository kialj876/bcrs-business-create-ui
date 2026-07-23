import sinon from 'sinon'
import LegalServices from '@/services/legal-services'
import { AxiosInstance as axios } from '@/utils'
import * as FeatureFlags from '@/utils/feature-flag-utils'
import { DocumentTypes, FilingTypes } from '@/enums'
import { CorpTypeCd } from '@bcrs-shared-components/corp-type-module'

// Populate session variables
sessionStorage.setItem('BUSINESS_API_URL', 'https://business-api.url/')

describe('Legal Services', () => {
  afterEach(() => {
    sinon.restore()
    vi.restoreAllMocks()
  })

  it.skip('fetches the filings list', async () => {
    // FUTURE
  })

  it('fetches the only filing', async () => {
    // mock single item response
    sinon.stub(axios, 'get').withArgs('https://business-api.url/businesses/123/filings')
      .resolves({
        data: {
          filing: {
            header: {
              name: 'registration',
              filingId: 123
            },
            registration: {
              offices: [],
              contactPoint: {},
              parties: []
            }
          }
        }
      })

    // fetch draft and check it
    const draft: any = await LegalServices.fetchFirstOrOnlyFiling('123')
    expect(draft).not.toBeFalsy()
    expect(draft).toHaveProperty('header')
    expect(draft).toHaveProperty('registration')
    expect(draft.header).toHaveProperty('name')
    expect(draft.header).toHaveProperty('filingId')
    expect(draft.registration).toHaveProperty('offices')
    expect(draft.registration).toHaveProperty('contactPoint')
    expect(draft.registration).toHaveProperty('parties')
  })

  it('fetches the first filing', async () => {
    // mock list response
    sinon.stub(axios, 'get').withArgs('https://business-api.url/businesses/123/filings')
      .resolves({
        data: {
          filings: [
            {
              name: 'registration',
              filingId: 123
            }
          ]
        }
      })

    // fetch draft and check it
    const draft: any = await LegalServices.fetchFirstOrOnlyFiling('123')
    expect(draft).not.toBeFalsy()
    expect(draft).toHaveProperty('name')
    expect(draft).toHaveProperty('filingId')
  })

  it.skip('fetches the first task', async () => {
    // FUTURE
  })

  it.skip('fetches a filing from its url', async () => {
    // FUTURE
  })

  it.skip('updates an existing filing', async () => {
    // FUTURE
  })

  it.skip('fetches a name request', async () => {
    // FUTURE
  })

  it.skip('fetches parties', async () => {
    // FUTURE
  })

  it.skip('fetches directors', async () => {
    // FUTURE
  })

  it.skip('fetches share structure', async () => {
    // FUTURE
  })

  it('fetches resolutions', async () => {
    // mock list response
    sinon.stub(axios, 'get').withArgs('https://business-api.url/businesses/123/resolutions')
      .resolves({
        data: {
          resolutions: [
            {
              date: '2024-07-15',
              id: 123456,
              type: 'SPECIAL'
            },
            {
              date: '2024-07-16',
              id: 123457,
              type: 'SPECIAL'
            }
          ]
        }
      })

    // fetch resolutions and check it
    const response: any = await LegalServices.fetchResolutions('123')
    expect(response.length).toEqual(2)
    expect(response.at(0)).toHaveProperty('date')
    expect(response.at(0)).toHaveProperty('type')
  })

  it.skip('fetches addresses', async () => {
    // FUTURE
  })

  it.skip('fetches business info', async () => {
    // FUTURE
  })

  it.skip('fetches authorized actions', async () => {
    // FUTURE
  })

  it('uploads a document to DRS when the drs-upload feature is enabled', async () => {
    vi.spyOn(FeatureFlags, 'GetFeatureFlag').mockReturnValue('incorporationApplication-completingParty,drs-upload')

    // mock DRS upload response
    const post = sinon.stub(axios, 'post')
    post.withArgs('https://business-api.url/documents/client/dissolution/CP/affidavit')
      .resolves({
        status: 201,
        data: {
          documentServiceId: 'DS0100001003',
          key: 'COOP-DS0100001003'
        }
      })

    const file = new File(['data'], 'affidavit.pdf', { type: 'application/pdf' })
    const doc = await LegalServices.uploadDocument(file, FilingTypes.DISSOLUTION, CorpTypeCd.COOP,
      DocumentTypes.AFFIDAVIT, 'keycloak-guid', 'CP1002605', 111)

    expect(doc.key).toBe('COOP-DS0100001003')
    expect(doc.documentServiceId).toBe('DS0100001003')
    // verify document metadata query params
    expect(post.firstCall.args[2].params).toEqual({
      filename: 'affidavit.pdf',
      businessIdentifier: 'CP1002605',
      filingId: 111
    })
  })

  it('throws when the DRS document upload fails', async () => {
    vi.spyOn(FeatureFlags, 'GetFeatureFlag').mockReturnValue('incorporationApplication-completingParty,drs-upload')

    // mock DRS upload error
    sinon.stub(axios, 'post').rejects(new Error('went wrong'))

    const file = new File(['data'], 'affidavit.pdf', { type: 'application/pdf' })
    await expect(
      LegalServices.uploadDocument(file, FilingTypes.DISSOLUTION, CorpTypeCd.COOP,
        DocumentTypes.AFFIDAVIT, 'keycloak-guid', 'CP1002605', 111)
    ).rejects.toThrow()
  })

  it('uploads a document via Minio when the drs-upload feature is disabled', async () => {
    vi.spyOn(FeatureFlags, 'GetFeatureFlag').mockReturnValue('incorporationApplication-completingParty')

    // mock presigned url + Minio upload responses
    sinon.stub(axios, 'get').withArgs('https://business-api.url/documents/affidavit.pdf/signatures')
      .resolves({
        data: {
          preSignedUrl: 'https://minio.url/affidavit.pdf',
          key: 'minio-key-123'
        }
      })
    sinon.stub(axios, 'put').withArgs('https://minio.url/affidavit.pdf')
      .resolves({ status: 200 })

    const file = new File(['data'], 'affidavit.pdf', { type: 'application/pdf' })
    const doc = await LegalServices.uploadDocument(file, FilingTypes.DISSOLUTION, CorpTypeCd.COOP,
      DocumentTypes.AFFIDAVIT, 'keycloak-guid', 'CP1002605', 111)

    expect(doc.key).toBe('minio-key-123')
  })

  it('throws when the Minio document upload fails', async () => {
    vi.spyOn(FeatureFlags, 'GetFeatureFlag').mockReturnValue('')

    // mock presigned url response + Minio upload error
    sinon.stub(axios, 'get').withArgs('https://business-api.url/documents/affidavit.pdf/signatures')
      .resolves({
        data: {
          preSignedUrl: 'https://minio.url/affidavit.pdf',
          key: 'minio-key-123'
        }
      })
    sinon.stub(axios, 'put').rejects(new Error('went wrong'))

    const file = new File(['data'], 'affidavit.pdf', { type: 'application/pdf' })
    await expect(
      LegalServices.uploadDocument(file, FilingTypes.DISSOLUTION, CorpTypeCd.COOP,
        DocumentTypes.AFFIDAVIT, 'keycloak-guid', 'CP1002605', 111)
    ).rejects.toThrow()
  })

  it('deletes a document', async () => {
    const del = sinon.stub(axios, 'delete').resolves({ status: 200 })

    // DRS-format key -> client endpoint
    await LegalServices.deleteDocument('COOP-DS0100001003')
    expect(del.firstCall.args[0]).toBe('https://business-api.url/documents/client/COOP-DS0100001003')

    // legacy Minio key -> legacy endpoint
    await LegalServices.deleteDocument('7e0ab7b9-9d43-46bd-9f9c-8fca2ab77854.pdf')
    expect(del.secondCall.args[0]).toBe('https://business-api.url/documents/7e0ab7b9-9d43-46bd-9f9c-8fca2ab77854.pdf')
  })

  it('downloads a document', async () => {
    // stub object URL functions (not implemented in jsdom)
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:url')
    window.URL.revokeObjectURL = vi.fn()

    const get = sinon.stub(axios, 'get').resolves({ status: 200, data: 'pdf data' })

    // DRS-format key -> client endpoint
    await LegalServices.downloadDocument('COOP-DS0100001003', 'affidavit.pdf')
    expect(get.firstCall.args[0]).toBe('https://business-api.url/documents/client/COOP-DS0100001003')

    // legacy Minio key -> legacy endpoint
    await LegalServices.downloadDocument('7e0ab7b9-9d43-46bd-9f9c-8fca2ab77854.pdf', 'affidavit.pdf')
    expect(get.secondCall.args[0]).toBe('https://business-api.url/documents/7e0ab7b9-9d43-46bd-9f9c-8fca2ab77854.pdf')
  })
})
