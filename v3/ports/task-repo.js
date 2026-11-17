/**
 * @typedef {object} TaskRepo
 * @property {(input: object) => object} create
 * @property {(id: string) => object | null} get
 * @property {(id: string, patch: object) => object} update
 * @property {(engagementId: string, filters?: object) => object[]} list
 * @property {(id: string, options: object) => object} approve
 */
export {}
