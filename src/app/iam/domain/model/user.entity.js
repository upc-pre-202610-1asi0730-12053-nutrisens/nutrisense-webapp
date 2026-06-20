import { GoalType } from '../../../shared/domain/model/goal-type.record.js'
import { Email } from './email.record.js'
import { BiologicalSex } from './biological-sex.record.js'
import { ActivityLevel } from './activity-level.record.js'
import { PlanTier } from './plan-tier.record.js'
import { PreferredUnits } from './preferred-units.record.js'

/**
 * @typedef {Object} UserProps
 * @property {string} id
 * @property {string} email
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} dateOfBirth - YYYY-MM-DD
 * @property {import('./biological-sex.record.js').BiologicalSexValue} biologicalSex
 * @property {number} heightCm
 * @property {import('../../../shared/domain/model/goal-type.record.js').GoalTypeValue} goal
 * @property {import('./activity-level.record.js').ActivityLevelValue} activityLevel
 * @property {import('./preferred-units.record.js').PreferredUnitsValue} preferredUnits
 * @property {string} preferredLanguage
 * @property {import('./plan-tier.record.js').PlanTierValue} plan
 * @property {string} homeCityId
 * @property {string} createdAt
 * @property {string[]} dietaryRestrictions
 * @property {string[]} medicalConditions
 */

/** @param {UserProps} props */
export function User(props) {
  const email = Email(props.email)
  const goal = props.goal != null ? GoalType(props.goal) : null
  const activityLevel = props.activityLevel != null ? ActivityLevel(props.activityLevel) : null
  const plan = props.plan != null ? PlanTier(props.plan) : null
  const biologicalSex = props.biologicalSex != null ? BiologicalSex(props.biologicalSex) : null
  const preferredUnits = PreferredUnits(props.preferredUnits)

  return Object.freeze({
    id: props.id,
    email,
    firstName: props.firstName,
    lastName: props.lastName,
    dateOfBirth: props.dateOfBirth,
    biologicalSex,
    heightCm: props.heightCm,
    goal,
    activityLevel,
    preferredUnits,
    preferredLanguage: props.preferredLanguage,
    plan,
    homeCityId: props.homeCityId,
    createdAt: props.createdAt,
    dietaryRestrictions: props.dietaryRestrictions ?? [],
    medicalConditions: props.medicalConditions ?? [],

    /** @returns {string} */
    fullName() { return `${props.firstName} ${props.lastName}` },
    /** @returns {number} */
    age() {
      const dob = new Date(props.dateOfBirth)
      const today = new Date()
      let years = today.getFullYear() - dob.getFullYear()
      const notYetBirthday =
        today.getMonth() < dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
      return notYetBirthday ? years - 1 : years
    },
    /** @returns {string} two-letter initials for the avatar */
    avatarInitials() {
      return `${props.firstName[0]}${props.lastName[0]}`.toUpperCase()
    },
    /**
     * Returns true when the user has completed the onboarding flow.
     * A blank dateOfBirth or homeCityId indicates a freshly registered account.
     * @returns {boolean}
     */
    isOnboardingComplete() {
      return Boolean(props.dateOfBirth && props.homeCityId)
    },
    /**
     * @param {import('./plan-tier.record.js').PlanTierValue} minimumPlan
     * @returns {boolean}
     */
    isOnAtLeastPlan(minimumPlan) { return plan.isAtLeast(minimumPlan) },
  })
}
