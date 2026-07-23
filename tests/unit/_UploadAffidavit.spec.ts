import Vue from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useStore } from '@/store/store'
import { shallowWrapperFactory, wrapperFactory } from '../vitest-wrapper-factory'
import Affidavit from '@/components/Dissolution/CompleteAffidavit.vue'
import { DissolutionResources } from '@/resources'
import { DocumentTypes, FilingTypes } from '@/enums'
import { CorpTypeCd } from '@bcrs-shared-components/corp-type-module'
import { LegalServices } from '@/services'

// Test Case Data
const uploadAffidavitTestCases = [
  {
    entityType: CorpTypeCd.COOP,
    helpText: 'The Cooperative Association has no assets; and',
    checkboxLabel: 'I confirm the following items are included as required in the Cooperative Associations Act'
  },
  {
    entityType: CorpTypeCd.BENEFIT_COMPANY,
    helpText: 'The Company has no assets; and',
    checkboxLabel: 'I confirm that the affidavit required by section 316(1)(a) of the Business Corporations ' +
      'Act has been obtained and deposited in the company\'s records office.'
  },
  {
    entityType: CorpTypeCd.BC_CCC,
    helpText: 'The Company has no assets; and',
    checkboxLabel: 'I confirm that the affidavit required by section 316(1)(a) of the Business Corporations ' +
      'Act has been obtained and deposited in the company\'s records office.'
  },
  {
    entityType: CorpTypeCd.BC_COMPANY,
    helpText: 'The Company has no assets; and',
    checkboxLabel: 'I confirm that the affidavit required by section 316(1)(a) of the Business Corporations ' +
      'Act has been obtained and deposited in the company\'s records office.'
  },
  {
    entityType: CorpTypeCd.BC_ULC_COMPANY,
    helpText: 'The Company has no assets; and',
    checkboxLabel: 'I confirm that the affidavit required by section 316(1)(a) of the Business Corporations ' +
      'Act has been obtained and deposited in the company\'s records office.'
  },
  {
    entityType: CorpTypeCd.BEN_CONTINUE_IN,
    helpText: 'The Company has no assets; and',
    checkboxLabel: 'I confirm that the affidavit required by section 316(1)(a) of the Business Corporations ' +
      'Act has been obtained and deposited in the company\'s records office.'
  },
  {
    entityType: CorpTypeCd.CCC_CONTINUE_IN,
    helpText: 'The Company has no assets; and',
    checkboxLabel: 'I confirm that the affidavit required by section 316(1)(a) of the Business Corporations ' +
      'Act has been obtained and deposited in the company\'s records office.'
  },
  {
    entityType: CorpTypeCd.CONTINUE_IN,
    helpText: 'The Company has no assets; and',
    checkboxLabel: 'I confirm that the affidavit required by section 316(1)(a) of the Business Corporations ' +
      'Act has been obtained and deposited in the company\'s records office.'
  },
  {
    entityType: CorpTypeCd.ULC_CONTINUE_IN,
    helpText: 'The Company has no assets; and',
    checkboxLabel: 'I confirm that the affidavit required by section 316(1)(a) of the Business Corporations ' +
      'Act has been obtained and deposited in the company\'s records office.'
  }
]

for (const test of uploadAffidavitTestCases) {
  describe(`Upload Affidavit view for a ${test.entityType}`, () => {
    let wrapper: any

    it('renders or hides the upload component', async () => {
      wrapper = shallowWrapperFactory(
        Affidavit,
        null,
        { entityType: test.entityType },
        null,
        DissolutionResources
      )

      if (test.entityType === CorpTypeCd.COOP) {
        expect(wrapper.find('#upload-affidavit-card').exists()).toBe(true)
      } else {
        expect(wrapper.find('#upload-affidavit-card').exists()).toBe(false)
      }
    })

    it('displays the correct help text', async () => {
      wrapper = shallowWrapperFactory(
        Affidavit,
        null,
        { entityType: test.entityType },
        null,
        DissolutionResources
      )

      wrapper.find('.help-btn').trigger('click')
      await Vue.nextTick()

      const helpList = wrapper.findAll('.affidavit-help li')
      expect(helpList.length).toBe(2)
      expect(helpList.at(0).text()).toContain(test.helpText)
    })

    it('displays the correct confirm text', async () => {
      wrapper = wrapperFactory(
        Affidavit,
        null,
        { entityType: test.entityType },
        null,
        DissolutionResources
      )

      expect(wrapper.find('#confirm-affidavit-section').text()).toContain(test.checkboxLabel)
    })
  })
}

describe('Upload Affidavit - document upload', () => {
  const store = (setActivePinia(createPinia()), useStore())
  let wrapper: any

  beforeEach(() => {
    store.stateModel.entityType = CorpTypeCd.COOP
    store.stateModel.business.businessId = 'CP1002605'
    store.stateModel.filingId = 111
    store.stateModel.uploadAffidavitStep.affidavitFile = null
    store.stateModel.uploadAffidavitStep.docKey = null
    wrapper = wrapperFactory(
      Affidavit,
      null,
      { entityType: CorpTypeCd.COOP },
      null,
      DissolutionResources
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    wrapper.destroy()
  })

  it('uploads the affidavit file and stores the document key', async () => {
    const uploadDocument = vi.spyOn(LegalServices, 'uploadDocument').mockResolvedValue(
      { key: 'COOP-DS0100001003', documentServiceId: 'DS0100001003' }
    )

    // simulate file selection
    const vm = wrapper.vm as any
    const file = new File(['data'], 'affidavit.pdf', { type: 'application/pdf' })
    vm.onFileValidity(true)
    await vm.onFileSelected(file)

    // verify upload call and stored values
    expect(uploadDocument).toHaveBeenCalledWith(file, FilingTypes.DISSOLUTION,
      CorpTypeCd.COOP, DocumentTypes.AFFIDAVIT, store.getKeycloakGuid, 'CP1002605', 111)
    expect(store.stateModel.uploadAffidavitStep.docKey).toBe('COOP-DS0100001003')
    expect(store.stateModel.uploadAffidavitStep.affidavitFile.name).toBe('affidavit.pdf')
  })

  it('displays an error message when the upload fails', async () => {
    vi.spyOn(LegalServices, 'uploadDocument').mockRejectedValue(new Error('went wrong'))

    // simulate file selection
    const vm = wrapper.vm as any
    const file = new File(['data'], 'affidavit.pdf', { type: 'application/pdf' })
    vm.onFileValidity(true)
    await vm.onFileSelected(file)

    // verify error state and no stored values
    expect(vm.fileUploadCustomErrorMsg).toBe(vm.UPLOAD_FAILED_MESSAGE)
    expect(vm.hasValidUploadFile).toBe(false)
    expect(store.stateModel.uploadAffidavitStep.docKey).toBeNull()
  })

  it('deletes the document when the file is cleared', async () => {
    const deleteDocument = vi.spyOn(LegalServices, 'deleteDocument').mockResolvedValue(null)

    // seed a local doc key then simulate file clear
    const vm = wrapper.vm as any
    vm.uploadAffidavitDocKey = 'COOP-DS0100001003'
    await vm.onFileSelected(null)

    // verify delete call and cleared values
    expect(deleteDocument).toHaveBeenCalledWith('COOP-DS0100001003')
    expect(store.stateModel.uploadAffidavitStep.docKey).toBeNull()
    expect(store.stateModel.uploadAffidavitStep.affidavitFile).toBeNull()
  })
})
