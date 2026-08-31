<template>
  <div id="amalgamation-people-roles">
    <section class="mt-10">
      <header id="people-role-header">
        <h2>{{ getPeopleAndRolesResource.header }}</h2>
      </header>

      <!-- short-form directors are adopted from the holding/primary business -->
      <MessageBox
        v-if="isAmalgamationFilingHorizontal || isAmalgamationFilingVertical"
        color="gold"
        class="mt-6"
      >
        <p>
          <strong>Important:</strong> To update the directors, save this draft application and
          visit the {{ isAmalgamationFilingHorizontal ? 'primary' : 'holding' }} business'
          dashboard. Make the director changes there and come back to this application.
        </p>
      </MessageBox>

      <PeopleAndRoles />
    </section>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Getter } from 'pinia-class'
import { useStore } from '@/store/store'
import { PeopleAndRoleIF, PeopleAndRolesResourceIF } from '@/interfaces'
import { CommonMixin } from '@/mixins'
import { RouteNames } from '@/enums'
import MessageBox from '@/components/common/MessageBox.vue'
import PeopleAndRoles from '@/components/common/PeopleAndRoles.vue'

@Component({
  components: {
    MessageBox,
    PeopleAndRoles
  }
})
export default class AmalgamationPeopleRoles extends Mixins(CommonMixin) {
  @Getter(useStore) getAddPeopleAndRoleStep!: PeopleAndRoleIF
  @Getter(useStore) getPeopleAndRolesResource!: PeopleAndRolesResourceIF
  @Getter(useStore) getShowErrors!: boolean
  @Getter(useStore) isAmalgamationFilingHorizontal!: boolean
  @Getter(useStore) isAmalgamationFilingVertical!: boolean

  @Watch('$route')
  private async scrollToInvalidComponent (): Promise<void> {
    if (
      this.getShowErrors &&
      (
        this.$route.name === RouteNames.AMALG_REG_PEOPLE_ROLES ||
        this.$route.name === RouteNames.AMALG_SHORT_PEOPLE_ROLES
      )
    ) {
      // scroll to invalid components
      await this.$nextTick()
      await this.validateAndScroll(
        {
          peopleAndRoles: this.getAddPeopleAndRoleStep.valid
        },
        [
          'people-and-roles'
        ]
      )
    }
  }
}
</script>

<style lang="scss" scoped>
.meta-container {
  display: flex;
  flex-flow: column nowrap;
  position: relative;

  > label:first-child {
    font-weight: bold;
  }
}

@media (min-width: 768px) {
  .meta-container {
    flex-flow: row nowrap;

    > label:first-child {
      flex: 0 0 auto;
      padding-right: 2rem;
      width: 12rem;
    }
  }
}

header p {
  padding-top: 0.5rem;
}
</style>
