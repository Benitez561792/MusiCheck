export type Role = "aluno" | "dono"

export type UserProfile = {
    name: string
    email: string
    role: Role
}

export type School = {
    id: string
    name: string
    address: string
    latitude: number
    longitude: number
    /** Distância máxima, em metros, para aceitar o check-in */
    radiusMeters: number
}

export type Teacher = {
    id: string
    name: string
    instrument: string
    active: boolean
}

export type Checkin = {
    /** {studentId}_{AAAA-MM-DD} */
    id: string
    studentId: string
    studentName: string
    schoolId: string
    schoolName: string
    teacherId: string
    teacherName: string
    /** AAAA-MM-DD, no horário do aparelho */
    date: string
    /** Semana ISO, ex.: 2026-W46 */
    week: string
    distanceMeters: number
    createdAt: Date | null
}
