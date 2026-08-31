<template>
  <v-simple-table id="business-table-summary">
    <template #default>
      <thead>
        <tr>
          <th>Business Name</th>
          <th>Mailing Address</th>
          <th>Role</th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="!getAmalgamatingBusinesses.length">
          <td colspan="3">
            <p class="text-center mb-0">
              No businesses added
            </p>
          </td>
        </tr>

        <tr
          v-for="item in getAmalgamatingBusinesses"
          :key="item.identifier"
        >
          <td class="business-name">
            <v-icon color="gray9">
              mdi-domain
            </v-icon>
            <strong>{{ name(item) }}</strong><br>{{ email(item) }}
          </td>

          <td class="business-address">
            <template v-if="isLearOrBcColin(item)">
              <BaseAddress
                v-if="item.addresses"
                :address="registeredOfficeMailingAddress(item)"
              />
              <span v-else>Affiliate to view</span>
            </template>

            <template v-if="isForeignOrXproColin(item)">
              {{ jurisdiction(item) }}
            </template>
          </td>

          <td class="business-role">
            {{ role(item) }}
          </td>
        </tr>
      </tbody>
    </template>
  </v-simple-table>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { Getter } from 'pinia-class'
import { getName } from 'country-list'
import { useStore } from '@/store/store'
import { AmlRoles, AmlTypes } from '@/enums'
import { AddressIF, AmalgamatingBusinessIF } from '@/interfaces'
import { BaseAddress } from '@bcrs-shared-components/base-address'
import { CorpTypeCd } from '@bcrs-shared-components/corp-type-module'

@Component({
  components: {
    BaseAddress
  }
})
export default class BusinessTableSummary extends Vue {
  readonly AmlRoles = AmlRoles
  readonly AmlTypes = AmlTypes

  @Getter(useStore) getAmalgamatingBusinesses!: AmalgamatingBusinessIF[]

  /** True for foreign businesses and for COLIN businesses that are extraprovincial (legal type A). */
  isForeignOrXproColin (item: AmalgamatingBusinessIF): boolean {
    return (
      item?.type === AmlTypes.FOREIGN ||
      (item?.type === AmlTypes.COLIN && item.legalType === CorpTypeCd.EXTRA_PRO_A)
    )
  }

  /** True for LEAR businesses and for COLIN businesses that are not extraprovincial. */
  isLearOrBcColin (item: AmalgamatingBusinessIF): boolean {
    return (
      item?.type === AmlTypes.LEAR ||
      (item?.type === AmlTypes.COLIN && item.legalType !== CorpTypeCd.EXTRA_PRO_A)
    )
  }

  name (item: AmalgamatingBusinessIF): string {
    if (item?.type === AmlTypes.LEAR || item?.type === AmlTypes.COLIN) return item.name
    if (item?.type === AmlTypes.FOREIGN) return item.legalName
    return '(Unknown)' // should never happen
  }

  email (item: AmalgamatingBusinessIF): string {
    if (this.isLearOrBcColin(item)) {
      return (item as any).authInfo?.contacts?.[0]?.email || 'Email not available'
    }
    return null // extrapro COLIN and foreign businesses have no contact email
  }

  registeredOfficeMailingAddress (item: AmalgamatingBusinessIF): AddressIF {
    if (item?.type === AmlTypes.LEAR || item?.type === AmlTypes.COLIN) {
      return item.addresses?.registeredOffice?.mailingAddress
    }
    return null // should never happen
  }

  jurisdiction (item: AmalgamatingBusinessIF): string {
    // extrapro COLIN rows carry the resolved home jurisdiction string from the COLIN snapshot
    // ('BC' | province code | 'FD' | free text)
    if (item?.type === AmlTypes.COLIN) {
      const j = item.jurisdiction
      if (!j) return '(Unknown)' // should never happen
      if (j === 'FD') return 'Federal, Canada'
      if (/^[A-Z]{2}$/.test(j)) return `${j}, Canada`
      return j
    }

    const fj = (item?.type === AmlTypes.FOREIGN) && item.foreignJurisdiction
    if (fj?.country) {
      const country = getName(fj.country)
      const region = (fj.region === 'FEDERAL' ? 'Federal' : fj.region)
      if (region) return `${region}, ${country}`
      return country
    }
    return '(Unknown)' // should never happen
  }

  role (item: AmalgamatingBusinessIF): string {
    switch (item.role) {
      case AmlRoles.AMALGAMATING: return 'Amalgamating Business'
      case AmlRoles.HOLDING: return 'Holding Business'
      case AmlRoles.PRIMARY: return 'Primary Business'
      default: return '(Unknown)' // should never happen
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/theme.scss';

.theme--light.v-data-table > .v-data-table__wrapper > table {
  // table header rows
  & > thead > tr {
    & > th {
      color: $gray9;
      font-size: $px-14;
      padding: 1rem;
    }
    & th:first-of-type {
      padding-left: 2rem;
    }
    & th:last-of-type {
      padding-right: 2rem;
    }
  }

  // table body rows
  & > tbody> tr {
    & > td {
      color: $gray7;
      padding: 1.125rem;
      vertical-align: top;
    }
    & td:first-of-type {
      padding-left: 2rem;
    }
    & td:last-of-type {
      padding-right: 2rem;
    }
    & td.business-name {
      max-width: 200px;
      // show ellipsis when email overflows
      // (doesn't affect name because name breaks on spaces)
      overflow-x: hidden;
      text-overflow: ellipsis;

      .v-icon {
        margin-top: -4px;
        margin-left: -34px;
        padding-right: 8px;
      }
    }
    & td.business-address {
      min-width: 200px;
    }
    & td.business-role {
      max-width: 130px;
    }
    // disable hover color
    &:hover:not(.v-data-table__expanded__content):not(.v-data-table__empty-wrapper) {
      background-color: inherit;
    }
  }
}
</style>
