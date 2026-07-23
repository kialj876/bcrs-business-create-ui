import Vue from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useStore } from '@/store/store'
import { wrapperFactory } from '../vitest-wrapper-factory'
import { ExistingBusinessInfoIF } from '@/interfaces'
import { DocumentTypes, FilingTypes } from '@/enums'
import { CorpTypeCd } from '@bcrs-shared-components/corp-type-module'
import { LegalServices } from '@/services'
import UnlimitedLiabilityCorporationInformation
  from '@/components/ContinuationIn/UnlimitedLiabilityCorporationInformation.vue'

setActivePinia(createPinia())
const store = useStore()

describe('Unlimited Liability Corporation Information component', () => {
  it('renders the component correctly with no file', async () => {
    // set some store values
    store.stateModel.continuationIn.existingBusinessInfo = {} as ExistingBusinessInfoIF
    store.stateModel.entityType = CorpTypeCd.ULC_CONTINUE_IN

    const wrapper = wrapperFactory(UnlimitedLiabilityCorporationInformation)
    await Vue.nextTick()

    // verify component exists
    expect(wrapper.findComponent(UnlimitedLiabilityCorporationInformation).exists()).toBe(true)
    expect(wrapper.find('#unlimited-liability-corporation-information').exists()).toBe(true)

    // verify initial validity
    const valid = wrapper.emitted().valid
    expect(valid[0][0]).toBe(false)

    // verify misc content
    expect(wrapper.find('label').text()).toBe('Upload File')
    expect(wrapper.find('p').text()).toContain('You are required to provide')
    expect(wrapper.find('ul').text()).toContain('Use a white background')
    expect(wrapper.find('ul').text()).toContain('PDF file type')
    expect(wrapper.find('#add-affidavit-button').text()).toBe('Add a Document')
    expect(wrapper.find('#add-affidavit-button').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.document-details').exists()).toBe(false)
    expect(wrapper.find('.remove-document-button').exists()).toBe(false)

    wrapper.destroy()
  })

  it('renders the component correctly with existing file', async () => {
    // set some store values
    store.stateModel.continuationIn.existingBusinessInfo = {
      affidavitFile: { name: 'test.pdf', size: 123456 } as File,
      affidavitFileKey: 'abc-123',
      affidavitFileName: 'test.pdf'
    } as ExistingBusinessInfoIF
    store.stateModel.entityType = CorpTypeCd.ULC_CONTINUE_IN

    const wrapper = wrapperFactory(UnlimitedLiabilityCorporationInformation)
    await Vue.nextTick()

    // verify component exists
    expect(wrapper.findComponent(UnlimitedLiabilityCorporationInformation).exists()).toBe(true)
    expect(wrapper.find('#unlimited-liability-corporation-information').exists()).toBe(true)

    // verify initial validity
    const valid = wrapper.emitted().valid
    expect(valid[0][0]).toBe(true)

    // verify misc content
    expect(wrapper.find('#add-affidavit-button').attributes('disabled')).toBe('disabled')
    expect(wrapper.find('.document-details').exists()).toBe(true)
    expect(wrapper.find('.document-details').text()).toBe('test.pdf (121 KB)')
    expect(wrapper.find('.remove-document-button').exists()).toBe(true)
    expect(wrapper.find('.remove-document-button').text()).toBe('Remove')

    wrapper.destroy()
  })

  it('uploads the affidavit and stores the document key', async () => {
    // set some store values
    store.stateModel.continuationIn.existingBusinessInfo = {} as ExistingBusinessInfoIF
    store.stateModel.entityType = CorpTypeCd.ULC_CONTINUE_IN
    store.stateModel.tempId = 'T1234567'
    store.stateModel.filingId = 111

    const uploadDocument = vi.spyOn(LegalServices, 'uploadDocument').mockResolvedValue(
      { key: 'CORP-DS0100001003', documentServiceId: 'DS0100001003' }
    )

    const wrapper = wrapperFactory(UnlimitedLiabilityCorporationInformation)
    await Vue.nextTick()

    // simulate file selection
    const vm = wrapper.vm as any
    const file = new File(['data'], 'affidavit.pdf', { type: 'application/pdf' })
    vm.onFileValidity(true)
    await vm.onFileSelected(file)

    // verify upload call and stored values
    expect(uploadDocument).toHaveBeenCalledWith(file, FilingTypes.CONTINUATION_IN,
      CorpTypeCd.ULC_CONTINUE_IN, DocumentTypes.DIRECTOR_AFFIDAVIT, null, 'T1234567', 111)
    expect(store.stateModel.continuationIn.existingBusinessInfo.affidavitFileKey).toBe('CORP-DS0100001003')
    expect(store.stateModel.continuationIn.existingBusinessInfo.affidavitFileName).toBe('affidavit.pdf')

    vi.restoreAllMocks()
    wrapper.destroy()
  })

  it('displays an error message when the upload fails', async () => {
    // set some store values
    store.stateModel.continuationIn.existingBusinessInfo = {} as ExistingBusinessInfoIF
    store.stateModel.entityType = CorpTypeCd.ULC_CONTINUE_IN

    vi.spyOn(LegalServices, 'uploadDocument').mockRejectedValue(new Error('went wrong'))

    const wrapper = wrapperFactory(UnlimitedLiabilityCorporationInformation)
    await Vue.nextTick()

    // simulate file selection
    const vm = wrapper.vm as any
    const file = new File(['data'], 'affidavit.pdf', { type: 'application/pdf' })
    vm.onFileValidity(true)
    await vm.onFileSelected(file)

    // verify error message and no stored values
    expect(vm.customErrorMessage).toBe(vm.UPLOAD_FAILED_MESSAGE)
    expect(store.stateModel.continuationIn.existingBusinessInfo.affidavitFileKey).toBeUndefined()

    vi.restoreAllMocks()
    wrapper.destroy()
  })

  it('deletes the document when Remove is clicked', async () => {
    // set some store values
    store.stateModel.continuationIn.existingBusinessInfo = {
      affidavitFile: { name: 'test.pdf', size: 123456 } as File,
      affidavitFileKey: 'CORP-DS0100001003',
      affidavitFileName: 'test.pdf'
    } as ExistingBusinessInfoIF
    store.stateModel.entityType = CorpTypeCd.ULC_CONTINUE_IN

    const deleteDocument = vi.spyOn(LegalServices, 'deleteDocument').mockResolvedValue(null)

    const wrapper = wrapperFactory(UnlimitedLiabilityCorporationInformation)
    await Vue.nextTick()

    // simulate remove click
    const vm = wrapper.vm as any
    vm.onRemoveClicked()

    // verify delete call and cleared values
    expect(deleteDocument).toHaveBeenCalledWith('CORP-DS0100001003')
    expect(store.stateModel.continuationIn.existingBusinessInfo.affidavitFileKey).toBeUndefined()
    expect(store.stateModel.continuationIn.existingBusinessInfo.affidavitFileName).toBeUndefined()

    vi.restoreAllMocks()
    wrapper.destroy()
  })
})
