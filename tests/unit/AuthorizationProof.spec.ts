import Vue from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useStore } from '@/store/store'
import { wrapperFactory } from '../vitest-wrapper-factory'
import AuthorizationProof from '@/components/ContinuationIn/AuthorizationProof.vue'
import FileUploadPreview from '@/components/common/FileUploadPreview.vue'
import { DocumentTypes, FilingStatus, FilingTypes } from '@/enums'
import { CorpTypeCd } from '@bcrs-shared-components/corp-type-module'
import { LegalServices } from '@/services'
import MessageBox from '@/components/common/MessageBox.vue'

setActivePinia(createPinia())
const store = useStore()

describe('Authorization Proof component', () => {
  it('renders the component correctly - draft filing', async () => {
    const wrapper = wrapperFactory(AuthorizationProof)
    await Vue.nextTick()

    // verify main component exists
    expect(wrapper.findComponent(AuthorizationProof).exists()).toBe(true)
    expect(wrapper.find('#authorization-proof').exists()).toBe(true)

    // spot check some content (structure / text)
    const rows = wrapper.findAll('.row')
    expect(rows.length).toBe(1)

    expect(rows.at(0).find('.col-sm-3 > label').text()).toBe('Upload File')
    expect(rows.at(0).find('.col-sm-9 > p').text()).toContain('Upload one or more files')
    expect(rows.at(0).find('.col-sm-9 > ul').text()).toContain('Use a white background')
    expect(rows.at(0).find('.col-sm-9 > ul').text()).toContain('PDF file type')
    expect(rows.at(0).find('.col-sm-9 > ul').text()).toContain('Maximum 5 files')

    expect(rows.at(0).find('#add-document-button').text()).toBe('Add a Document')
    expect(rows.at(0).find('.error-text').exists()).toBe(false)
    expect(rows.at(0).find('.col-sm-9').findComponent(FileUploadPreview).exists()).toBe(true)

    wrapper.destroy()
  })

  it('renders the component correctly - change-requested filing', async () => {
    const wrapper = wrapperFactory(
      AuthorizationProof,
      null,
      {
        tombstone: { filingStatus: FilingStatus.CHANGE_REQUESTED },
        continuationIn: { existingBusinessInfo: { latestReviewComment: 'comment' } }
      }
    )
    await Vue.nextTick()

    // verify main component exists
    expect(wrapper.findComponent(AuthorizationProof).exists()).toBe(true)
    expect(wrapper.find('#authorization-proof').exists()).toBe(true)

    // spot check some content (structure / text)
    const rows = wrapper.findAll('.row')
    expect(rows.length).toBe(2)

    expect(rows.at(1).find('.col-sm-9').findComponent(MessageBox).exists()).toBe(true)

    wrapper.destroy()
  })

  it('uploads a file and stores the document key', async () => {
    // set some store values
    store.stateModel.continuationIn.authorizationProof = null
    store.stateModel.entityType = CorpTypeCd.CONTINUE_IN
    store.stateModel.tempId = 'T1234567'
    store.stateModel.filingId = 111

    const uploadDocument = vi.spyOn(LegalServices, 'uploadDocument').mockResolvedValue(
      { key: 'CORP-DS0100001003', documentServiceId: 'DS0100001003' }
    )

    const wrapper = wrapperFactory(AuthorizationProof)
    await Vue.nextTick()

    // simulate file selection
    const vm = wrapper.vm as any
    const file = new File(['data'], 'proof.pdf', { type: 'application/pdf' })
    vm.onFileValidity(true)
    await vm.onFileSelected(file)

    // verify upload call and stored values
    expect(uploadDocument).toHaveBeenCalledWith(file, FilingTypes.CONTINUATION_IN,
      CorpTypeCd.CONTINUE_IN, DocumentTypes.AUTHORIZATION_FILE, store.getKeycloakGuid, 'T1234567', 111)
    expect(vm.authorization.files.length).toBe(1)
    expect(vm.authorization.files[0].fileKey).toBe('CORP-DS0100001003')
    expect(vm.authorization.files[0].fileName).toBe('proof.pdf')

    vi.restoreAllMocks()
    wrapper.destroy()
  })

  it('does not upload a duplicate file', async () => {
    // reset store values
    store.stateModel.continuationIn.authorizationProof = null

    const uploadDocument = vi.spyOn(LegalServices, 'uploadDocument').mockResolvedValue(
      { key: 'CORP-DS0100001003', documentServiceId: 'DS0100001003' }
    )

    const wrapper = wrapperFactory(AuthorizationProof)
    await Vue.nextTick()

    // simulate selecting the same file twice
    const vm = wrapper.vm as any
    const file = new File(['data'], 'proof.pdf', { type: 'application/pdf' })
    vm.onFileValidity(true)
    await vm.onFileSelected(file)
    await vm.onFileSelected(file)

    // verify single upload and error message
    expect(uploadDocument).toHaveBeenCalledTimes(1)
    expect(vm.authorization.files.length).toBe(1)
    expect(vm.customErrorMessage).toBe('Duplicate file.')

    vi.restoreAllMocks()
    wrapper.destroy()
  })

  it('displays an error message when the upload fails', async () => {
    // reset store values
    store.stateModel.continuationIn.authorizationProof = null

    vi.spyOn(LegalServices, 'uploadDocument').mockRejectedValue(new Error('went wrong'))

    const wrapper = wrapperFactory(AuthorizationProof)
    await Vue.nextTick()

    // simulate file selection
    const vm = wrapper.vm as any
    const file = new File(['data'], 'proof.pdf', { type: 'application/pdf' })
    vm.onFileValidity(true)
    await vm.onFileSelected(file)

    // verify error message and no stored file
    expect(vm.customErrorMessage).toBe(vm.UPLOAD_FAILED_MESSAGE)
    expect(vm.authorization.files.length).toBe(0)

    vi.restoreAllMocks()
    wrapper.destroy()
  })

  it('deletes a file when Remove is clicked', async () => {
    // reset store values
    store.stateModel.continuationIn.authorizationProof = null

    const deleteDocument = vi.spyOn(LegalServices, 'deleteDocument').mockResolvedValue(null)

    const wrapper = wrapperFactory(AuthorizationProof)
    await Vue.nextTick()

    // seed a file then simulate remove click
    const vm = wrapper.vm as any
    vm.authorization.files.push({
      file: { name: 'proof.pdf', lastModified: 123, size: 456 } as File,
      fileKey: 'CORP-DS0100001003',
      fileName: 'proof.pdf'
    })
    vm.onRemoveClicked(0)

    // verify delete call and cleared array
    expect(deleteDocument).toHaveBeenCalledWith('CORP-DS0100001003')
    expect(vm.authorization.files.length).toBe(0)

    vi.restoreAllMocks()
    wrapper.destroy()
  })
})
