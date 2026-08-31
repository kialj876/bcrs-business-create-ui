import { Component, Vue } from 'vue-property-decorator'
import { CurrencyList } from '@/constants'

/**
 * Mixin that provides currency list and lookup operations
 */
@Component({})
export default class CurrencyLookupMixin extends Vue {
  getCurrencyList (): Array<any> {
    return CurrencyList
  }

  getCurrencyNameByCode (code: string): string {
    const currency = CurrencyList.find(currency => (currency as any).code === code) as any
    return currency?.name
  }
}
