import Vuetify from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import { useStore } from '@/store/store'
import { shallowMount } from '@vue/test-utils'
import { IncorporationResourceCp } from '@/resources/Incorporation/CP'
import { DocumentTypes, FilingTypes } from '@/enums'
import { CorpTypeCd } from '@bcrs-shared-components/corp-type-module'
import { LegalServices } from '@/services'
import UploadMemorandum from '@/components/Incorporation/UploadMemorandum.vue'

const vuetify = new Vuetify({})
setActivePinia(createPinia())
const store = useStore()

// Populate session variables
sessionStorage.setItem('BASE_URL', 'https://create.web.url/')

describe('Upload Memorandum view for a COOP', () => {
  let wrapper: any

  beforeEach(() => {
    store.resourceModel.createMemorandum = IncorporationResourceCp.createMemorandum
    wrapper = shallowMount(UploadMemorandum, {
      vuetify,
      propsData: { helpToggle: true }
    })
  })

  afterEach(() => {
    wrapper.destroy()
  })

  it('renders Upload Memorandum main component', () => {
    expect(wrapper.find('#upload-memorandum').exists()).toBe(true)
  })

  it('renders each section', () => {
    expect(wrapper.find('#sample-memorandum-section').exists()).toBe(true)
    expect(wrapper.find('#confirm-memorandum-section').exists()).toBe(true)
    expect(wrapper.find('#upload-memorandum-section').exists()).toBe(true)
  })
})

describe('Upload Memorandum - document upload', () => {
  let wrapper: any

  beforeEach(() => {
    store.resourceModel.createMemorandum = IncorporationResourceCp.createMemorandum
    store.stateModel.entityType = CorpTypeCd.COOP
    store.stateModel.tempId = 'T1234567'
    store.stateModel.filingId = 111
    store.stateModel.createMemorandumStep.memorandumFile = null
    store.stateModel.createMemorandumStep.docKey = null
    wrapper = shallowMount(UploadMemorandum, { vuetify })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    wrapper.destroy()
  })

  it('uploads the memorandum file and stores the document key', async () => {
    const uploadDocument = vi.spyOn(LegalServices, 'uploadDocument').mockResolvedValue(
      { key: 'COOP-DS0100001003', documentServiceId: 'DS0100001003' }
    )

    // simulate file selection
    const vm = wrapper.vm as any
    const file = new File(['data'], 'memorandum.pdf', { type: 'application/pdf' })
    vm.onFileValidity(true)
    await vm.onFileSelected(file)

    // verify upload call and stored values
    expect(uploadDocument).toHaveBeenCalledWith(file, FilingTypes.INCORPORATION_APPLICATION,
      CorpTypeCd.COOP, DocumentTypes.COOP_MEMORANDUM, store.getKeycloakGuid, 'T1234567', 111)
    expect(store.stateModel.createMemorandumStep.docKey).toBe('COOP-DS0100001003')
    expect(store.stateModel.createMemorandumStep.memorandumFile.name).toBe('memorandum.pdf')
  })

  it('displays an error message when the upload fails', async () => {
    vi.spyOn(LegalServices, 'uploadDocument').mockRejectedValue(new Error('went wrong'))

    // simulate file selection
    const vm = wrapper.vm as any
    const file = new File(['data'], 'memorandum.pdf', { type: 'application/pdf' })
    vm.onFileValidity(true)
    await vm.onFileSelected(file)

    // verify error state and no stored values
    expect(vm.fileUploadCustomErrorMsg).toBe(vm.UPLOAD_FAILED_MESSAGE)
    expect(vm.hasValidUploadFile).toBe(false)
    expect(store.stateModel.createMemorandumStep.docKey).toBeNull()
  })

  it('deletes the document when the file is cleared', async () => {
    const deleteDocument = vi.spyOn(LegalServices, 'deleteDocument').mockResolvedValue(null)

    // seed a local doc key then simulate file clear
    const vm = wrapper.vm as any
    vm.uploadMemorandumDocKey = 'COOP-DS0100001003'
    await vm.onFileSelected(null)

    // verify delete call and cleared values
    expect(deleteDocument).toHaveBeenCalledWith('COOP-DS0100001003')
    expect(store.stateModel.createMemorandumStep.docKey).toBeNull()
    expect(store.stateModel.createMemorandumStep.memorandumFile).toBeNull()
  })
})
