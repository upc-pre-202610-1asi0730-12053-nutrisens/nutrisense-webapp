import { User } from '../domain/model/user.entity.js'

export class UserAssembler {
  /**
   * @param {Object} resource
   * @returns {ReturnType<typeof User>|null}
   */
  static toEntityFromResource(resource) {
    try {
      return User({
        id: resource.id,
        email: resource.email,
        firstName: resource.firstName,
        lastName: resource.lastName,
        dateOfBirth: resource.dateOfBirth,
        biologicalSex: resource.biologicalSex,
        heightCm: resource.heightCm,
        goal: resource.goal,
        activityLevel: resource.activityLevel,
        preferredUnits: resource.preferredUnits,
        preferredLanguage: resource.preferredLanguage,
        plan: resource.plan,
        homeCityId: resource.homeCityId,
        createdAt: resource.createdAt,
        dietaryRestrictions: Array.isArray(resource.dietaryRestrictions) ? resource.dietaryRestrictions : [],
        medicalConditions: Array.isArray(resource.medicalConditions) ? resource.medicalConditions : [],
      })
    } catch (e) {
      console.error('[UserAssembler] failed to map resource', e)
      return null
    }
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof User>[]}
   */
  static toEntitiesFromResponse(response) {
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(r => UserAssembler.toEntityFromResource(r)).filter(Boolean)
  }

  /**
   * @param {import('axios').AxiosResponse} response
   * @returns {ReturnType<typeof User>|null}
   */
  static toEntityFromResponse(response) {
    return UserAssembler.toEntityFromResource(response.data)
  }
}
