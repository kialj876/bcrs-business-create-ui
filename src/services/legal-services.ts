import { AxiosInstance as axios, GetFeatureFlag } from '@/utils'
import { AxiosResponse } from 'axios'
import { StatusCodes } from 'http-status-codes'
import { BusinessIF, DissolutionFilingIF, DocumentUploadIF, IncorporationFilingIF, NameRequestIF, OrgPersonIF,
  PresignedUrlIF, ResolutionIF } from '@/interfaces'
import { AuthorizedActions, DocumentTypes, FilingTypes, RoleTypes } from '@/enums'
import { ShareStructureIF } from '@bcrs-shared-components/interfaces'
import { CorpTypeCd } from '@bcrs-shared-components/corp-type-module'

/**
 * Class that provides integration with the Legal (aka Business) API.
 */
export default class LegalServices {
  /** The Business API URL. */
  static get businessApiUrl (): string {
    return sessionStorage.getItem('BUSINESS_API_URL')
  }

  /**
   * Fetches the filings list.
   * @param businessId the business identifier (aka entity inc no)
   * @returns a promise to return the filings list
   */
  static async fetchFilings (businessId: string): Promise<any[]> {
    const url = `${this.businessApiUrl}businesses/${businessId}/filings`

    return axios.get(url)
      .then(response => {
        const filings = response?.data?.filings
        if (!filings) {
          // eslint-disable-next-line no-console
          console.log('fetchFilings() error - invalid response =', response)
          throw new Error('Invalid filings list')
        }
        return filings
      })
  }

  /**
   * Fetches the first or only filing.
   * This is probably a draft Amalgamation, IA or Registration.
   * @param tempId the temp registration number
   * @returns a promise to return the draft filing
   */
  static async fetchFirstOrOnlyFiling (tempId: string): Promise<any> {
    const url = `${this.businessApiUrl}businesses/${tempId}/filings`

    return axios.get(url)
      .then(response => {
        let filing, filingName, filingId

        // if response is a list then look at only the first filing
        if (Array.isArray(response?.data?.filings)) {
          filing = response.data.filings[0]
          filingName = filing?.name as FilingTypes
          filingId = filing?.filingId
        }

        // otherwise expect response to be a single filing
        if (response?.data?.filing) {
          filing = response.data.filing
          filingName = filing?.header?.name as FilingTypes
          filingId = +filing?.header?.filingId || 0
        }

        if (!filing || !filingName || !filingId) {
          throw new Error('Invalid API response')
        }

        return filing
      })
  }

  /**
   * Fetches the first task.
   * This is probably a draft Dissolution or Restoration.
   * @param businessId the business identifier
   * @returns a promise to return the draft filing
   */
  static async fetchFirstTask (businessId: string): Promise<any> {
    const url = `${this.businessApiUrl}businesses/${businessId}/tasks`

    return axios.get(url)
      .then(response => {
        const filing = response?.data?.tasks?.[0]?.task.filing
        const filingName = filing?.header?.name as FilingTypes
        const filingId = +filing?.header?.filingId || 0

        if (!filing || !filingName || !filingId) {
          throw new Error('Invalid API response')
        }

        return filing
      })
  }

  /**
   * Fetches a filing from its url.
   * @param url the full URL to fetch the filing
   * @returns a promise to return the filing object
   */
  static async fetchFiling (url: string): Promise<any> {
    return axios.get(`${this.businessApiUrl}${url}`)
      .then(response => {
        const filing = response?.data?.filing
        if (!filing) {
          // eslint-disable-next-line no-console
          console.log('fetchFiling() error - invalid response =', response)
          throw new Error('Invalid filing')
        }
        return filing
      })
  }

  /**
   * Updates an existing filing.
   * @param id the business identifier or temp registration number
   * @param filing the filing object
   * @param isDraft whether to save draft or complete the filing
   * @returns a promise to return the updated filing
   */
  static async updateFiling (
    id: string,
    filing: IncorporationFilingIF | DissolutionFilingIF,
    isDraft: boolean
  ): Promise<any> {
    if (!filing) throw new Error('updateFiling(), invalid filing')

    const filingId = +filing.header?.filingId || 0
    if (!filingId) throw new Error('updateFiling(), invalid filing id')

    // put updated filing to filings endpoint
    let url = `${this.businessApiUrl}businesses/${id}/filings/${filingId}`
    if (isDraft) {
      url += '?draft=true'
    }

    return axios.put(url, { filing })
      .then(response => {
        const filing = response?.data?.filing
        const filingId = +filing?.header?.filingId || 0

        if (!filing || !filingId) {
          throw new Error('Invalid API response')
        }

        return filing
      })

    // NB: for error handling, see "save-error-event"
  }

  /**
   * Fetches a name request with optional phone and email for authorization.
   * @param nrNumber the name request number (eg, NR 1234567)
   * @param phone the name request phone number (eg, 123-4567)
   * @param email the name request email address (eg, me@example.com)
   * @returns a promise to return the NR data
   */
  static async fetchNameRequest (nrNumber: string, phone = '', email = ''): Promise<NameRequestIF> {
    if (!nrNumber) throw new Error('Invalid parameter \'nrNumber\'')

    const url = `${this.businessApiUrl}nameRequests/${nrNumber}/validate?phone=${phone}&email=${email}`

    return axios.get(url)
      .then(response => {
        const data = response?.data
        if (!data) throw new Error('Invalid API response')
        return data
      })
  }

  /**
   * Fetches the parties list.
   * @param businessId the business identifier
   * @returns a promise to return the parties from the response
   */
  static async fetchParties (businessId: string): Promise<any> {
    const url = `${this.businessApiUrl}businesses/${businessId}/parties`

    return axios.get(url)
      .then(response => {
        const data = response?.data
        if (!data) throw new Error('Invalid API response')
        return data
      })
  }

  /**
   * Fetches the directors of the current business.
   * @param businessId the business identifier
   * @returns a promise to return the directors from the response
   */
  static async fetchDirectors (businessId: string): Promise<OrgPersonIF[]> {
    const url = `${this.businessApiUrl}businesses/${businessId}/directors`

    return axios.get(url)
      .then(response => {
        const directors = response?.data?.directors as Array<any>

        if (!directors) throw new Error('Invalid API response')

        // return director list converted to org-person list
        return directors.map(director => {
          // WORK-AROUND WARNING !!!
          // convert directors from "middleInitial" to "middleName"
          const middleInitial = director.officer['middleInitial']
          if (middleInitial !== undefined) {
            director.officer.middleName = middleInitial
            delete director.officer['middleInitial']
          }

          const orgPerson: OrgPersonIF = {
            deliveryAddress: director.deliveryAddress,
            mailingAddress: director.mailingAddress,
            officer: director.officer,
            roles: [
              {
                appointmentDate: director.appointmentDate,
                cessationDate: director.cessationDate,
                roleType: RoleTypes.DIRECTOR
              }
            ]
          }

          return orgPerson
        })
      })
  }

  /**
   * Fetch the share structure of the current business.
   * @param businessId the business identifier
   * @returns a promise to return the share structure from the response
   */
  static async fetchShareStructure (businessId: string): Promise<ShareStructureIF> {
    const url = `${this.businessApiUrl}businesses/${businessId}/share-classes`

    return axios.get(url)
      .then(response => {
        const shareStructure = response.data as ShareStructureIF

        if (!shareStructure) throw new Error('Invalid API response')

        // apply a type to share classes and series
        shareStructure.shareClasses.forEach(shareClass => {
          shareClass.type = 'Class'
          shareClass.series.forEach(shareSeries => { shareSeries.type = 'Series' })
        })

        return shareStructure
      })
  }

  /**
   * Fetch the resolutions of the current business.
   * @param businessId the business identifier
   * @returns a promise to return the resolutions
   */
  static async fetchResolutions (businessId: string): Promise<ResolutionIF[]> {
    const url = `${this.businessApiUrl}businesses/${businessId}/resolutions`

    return axios.get(url)
      .then(response => {
        const resolutions = response?.data.resolutions

        if (!resolutions) throw new Error('Invalid API response')

        return resolutions
      })
  }

  /**
   * Fetches the addresses.
   * @param businessId the business identifier
   * @returns a promise to return the addresses from the response
   */
  static async fetchAddresses (businessId: string): Promise<any> {
    const url = `${this.businessApiUrl}businesses/${businessId}/addresses`

    return axios.get(url)
      .then(response => {
        const data = response?.data
        if (!data) throw new Error('Invalid API response')
        return data
      }).catch(error => {
        if (error?.response?.status === StatusCodes.NOT_FOUND) {
          return { businessOffice: null } // Business or Address not found (not an error)
        }
        throw error
      })
  }

  /**
   * Fetches the business info.
   * @param businessId the business identifier
   * @returns a promise to return the business info
   */
  static async fetchBusinessInfo (businessId: string): Promise<BusinessIF> {
    const url = `${this.businessApiUrl}businesses/${businessId}`

    return axios.get(url)
      .then(response => {
        const data = response?.data
        if (!data) throw new Error('Invalid API response')
        return data.business
      })
  }

  /**
   * Fetches the current account's authorized actions (permissions).
   * @returns a promise to return the list of authorized actions
   */
  static async fetchAuthorizedActions (): Promise<AuthorizedActions[]> {
    const url = `${this.businessApiUrl}permissions`

    return axios.get(url)
      .then(response => {
        const data = response?.data
        if (!data) throw new Error('Invalid API response')
        return data.authorizedPermissions
      })
  }

  /** Whether the DRS (Document Record Service) upload flow is enabled. */
  static get isDrsUploadEnabled (): boolean {
    const enabledFeatures: string[] = (GetFeatureFlag('enable-new-feature') || '').split(',')
    return enabledFeatures.includes('drs-upload')
  }

  /**
   * Whether the document key is a DRS key (eg, "CORP-DS0100001003")
   * vs a legacy Minio key (a UUID).
   * @param key the document key
   */
  private static isDrsDocumentKey (key: string): boolean {
    return /^[A-Z]+-DS\d+$/i.test(key)
  }

  /**
   * Uploads the specified document. When the DRS feature is enabled, this makes a single call
   * to the Legal API client document endpoint (which stores the document in the Document Record
   * Service). Otherwise it falls back to the legacy two-step Minio presigned-URL flow.
   * @param file the file to upload (PDF)
   * @param filingType the filing type (eg, FilingTypes.INCORPORATION_APPLICATION)
   * @param entityType the entity type (eg, CorpTypeCd.COOP)
   * @param documentType the document type (eg, DocumentTypes.COOP_RULES)
   * @param keycloakGuid the user's Keycloak GUID (legacy flow only)
   * @param businessIdentifier the business identifier or temp registration number, if available
   * @param filingId the filing id, if available
   * @returns a promise to return the document upload object (throws on error)
   */
  static async uploadDocument (
    file: File,
    filingType: FilingTypes,
    entityType: CorpTypeCd,
    documentType: DocumentTypes,
    keycloakGuid: string,
    businessIdentifier?: string,
    filingId?: number
  ): Promise<DocumentUploadIF> {
    if (this.isDrsUploadEnabled) {
      const url = `${this.businessApiUrl}documents/client/${filingType}/${entityType}/${documentType}`

      const config = {
        headers: { 'Content-Type': 'application/pdf' },
        params: {
          filename: file.name,
          businessIdentifier: businessIdentifier || undefined,
          filingId: filingId || undefined
        }
      }

      return axios.post(url, file, config)
        .then(response => {
          const data = response?.data as DocumentUploadIF
          if (!data?.key) {
            throw new Error('Invalid API response')
          }
          return data
        })
    } else {
      // legacy Minio flow
      const psu = await this.getPresignedUrl(file.name)
      const res = await this.uploadToUrl(psu.preSignedUrl, file, psu.key, keycloakGuid)
      if (!res || res.status !== StatusCodes.OK) {
        throw new Error('Invalid API response')
      }
      return { key: psu.key }
    }
  }

  /**
   * Gets a pre-signed URL for the specified filename.
   * @param filename the file name
   * @returns the presigned url object
   */
  static async getPresignedUrl (fileName: string): Promise<PresignedUrlIF> {
    const url = `${this.businessApiUrl}documents/${fileName}/signatures`

    return axios.get(url)
      .then(response => {
        const data = response?.data
        if (!data) {
          throw new Error('Invalid API response')
        }
        return data
      })
  }

  /**
   * Uploads the specified file to the specified (Minio) URL.
   * @param url the URL to upload to
   * @param file the file to upload
   * @param key the file key
   * @param userId the file user id
   * @returns a promise to return the axios response or the error response
   */
  static async uploadToUrl (url: string, file: File, key: string, userId: string): Promise<AxiosResponse> {
    // add/override headers
    const config = {
      headers: {
        'Content-Disposition': `attachment; filename=${file.name}`,
        'Content-Type': file.type,
        'x-amz-meta-userid': `${userId}`,
        'x-amz-meta-key': `${key}`
      }
    }

    return axios.put(url, file, config)
      .then(response => {
        return response
      }).catch(error => {
        return error.response
      })
  }

  /**
   * Deletes a document (DRS or legacy Minio, depending on the key format).
   * @param documentKey the document key
   * @returns a promise to return the axios response or the error response
   */
  static async deleteDocument (documentKey: string): Promise<AxiosResponse> {
    if (!documentKey) throw new Error('Invalid parameters')

    const url = this.isDrsDocumentKey(documentKey)
      ? `${this.businessApiUrl}documents/client/${documentKey}`
      : `${this.businessApiUrl}documents/${documentKey}`

    return axios.delete(url)
  }

  /**
   * Downloads a document (DRS or legacy Minio, depending on the key format)
   * and prompts browser to open/save it.
   * @param documentKey the document key
   * @param documentName the document filename
   * @returns a promise to return the axios response or the error response
   */
  static async downloadDocument (documentKey: string, documentName: string): Promise<AxiosResponse> {
    if (!documentKey || !documentName) throw new Error('Invalid parameters')

    const url = this.isDrsDocumentKey(documentKey)
      ? `${this.businessApiUrl}documents/client/${documentKey}`
      : `${this.businessApiUrl}documents/${documentKey}`

    // add/override headers
    const config = {
      headers: { 'Accept': 'application/pdf' },
      responseType: 'blob' as 'json'
    }

    return axios.get(url, config)
      .then(response => {
        if (!response) throw new Error('Null response')

        /* solution below is from https://github.com/axios/axios/issues/1392 */

        // it is necessary to create a new blob object with mime-type explicitly set
        // otherwise only Chrome works like it should
        const blob = new Blob([response.data], { type: 'application/pdf' })

        // use Navigator.msSaveOrOpenBlob if available (possibly IE)
        // warning: this is now deprecated
        // ref: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/msSaveOrOpenBlob
        if (window.navigator && window.navigator['msSaveOrOpenBlob']) {
          window.navigator['msSaveOrOpenBlob'](blob, documentName)
        } else {
          // for other browsers, create a link pointing to the ObjectURL containing the blob
          const url = window.URL.createObjectURL(blob)
          const a = window.document.createElement('a')
          window.document.body.appendChild(a)
          a.setAttribute('style', 'display: none')
          a.href = url
          a.download = documentName
          a.click()
          window.URL.revokeObjectURL(url)
          a.remove()
        }

        return response
      })
  }
}
