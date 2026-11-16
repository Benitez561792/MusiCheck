import {
    collection,
    doc,
    DocumentData,
    getDocs,
    query,
    QueryDocumentSnapshot,
    runTransaction,
    serverTimestamp,
    where,
} from "firebase/firestore"
import { firestore } from "@/config/firebase"
import { Checkin, School, Teacher } from "@/types"
import { toDateKey, toWeekKey } from "@/utils/dates"
import { distanceInMeters, formatDistance } from "@/utils/distance"
import { AppError } from "@/utils/errors"
import { getCurrentCoords } from "./locationService"

const checkinsRef = collection(firestore, "checkins")

function toCheckin(document: QueryDocumentSnapshot<DocumentData>): Checkin {
    const data = document.data()
    return {
        id: document.id,
        studentId: data.studentId,
        studentName: data.studentName,
        schoolId: data.schoolId ?? "",
        schoolName: data.schoolName ?? "",
        teacherId: data.teacherId,
        teacherName: data.teacherName,
        date: data.date,
        week: data.week,
        distanceMeters: data.distanceMeters,
        createdAt: data.createdAt?.toDate?.() ?? null,
    }
}

// Mais recentes primeiro
function byNewest(a: Checkin, b: Checkin): number {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
}

type CreateCheckinInput = {
    studentId: string
    studentName: string
    teacher: Teacher
    /** Unidade escolhida pelo aluno */
    school: School
}

export async function createCheckin({ studentId, studentName, teacher, school }: CreateCheckinInput): Promise<Checkin> {
    const coords = await getCurrentCoords()
    const distance = distanceInMeters(coords, school)
    if (distance > school.radiusMeters) {
        throw new AppError(
            `Você está a ${formatDistance(distance)} da ${school.name}. O check-in só é liberado a até ${formatDistance(school.radiusMeters)}. Confira se escolheu a unidade certa.`
        )
    }

    const now = new Date()
    const date = toDateKey(now)
    // O ID com a data garante no máximo um check-in por aluno por dia
    const checkinRef = doc(checkinsRef, `${studentId}_${date}`)
    const checkin: Omit<Checkin, "id" | "createdAt"> = {
        studentId,
        studentName,
        schoolId: school.id,
        schoolName: school.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        date,
        week: toWeekKey(now),
        distanceMeters: Math.round(distance),
    }

    await runTransaction(firestore, async (transaction) => {
        const existing = await transaction.get(checkinRef)
        if (existing.exists()) {
            throw new AppError("Você já fez check-in hoje. Até a próxima aula!")
        }
        transaction.set(checkinRef, { ...checkin, createdAt: serverTimestamp() })
    })

    return { ...checkin, id: checkinRef.id, createdAt: now }
}

export async function listStudentCheckins(studentId: string): Promise<Checkin[]> {
    const snapshot = await getDocs(query(checkinsRef, where("studentId", "==", studentId)))
    return snapshot.docs.map(toCheckin).sort(byNewest)
}

export async function listWeekCheckins(week: string): Promise<Checkin[]> {
    const snapshot = await getDocs(query(checkinsRef, where("week", "==", week)))
    return snapshot.docs.map(toCheckin).sort(byNewest)
}
