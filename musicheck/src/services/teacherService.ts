import { addDoc, collection, doc, getDocs, updateDoc } from "firebase/firestore"
import { firestore } from "@/config/firebase"
import { Teacher } from "@/types"

const teachersRef = collection(firestore, "professores")

export async function listTeachers(): Promise<Teacher[]> {
    const snapshot = await getDocs(teachersRef)
    return snapshot.docs
        .map((document) => {
            const data = document.data()
            return { id: document.id, name: data.name, instrument: data.instrument ?? "", active: data.active !== false }
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

export async function addTeacher(name: string, instrument: string): Promise<void> {
    await addDoc(teachersRef, { name: name.trim(), instrument: instrument.trim(), active: true })
}

export async function setTeacherActive(id: string, active: boolean): Promise<void> {
    await updateDoc(doc(teachersRef, id), { active })
}
