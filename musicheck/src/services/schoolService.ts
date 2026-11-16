import { addDoc, collection, doc, getDocs, setDoc } from "firebase/firestore"
import { firestore } from "@/config/firebase"
import { School } from "@/types"

// Cada unidade da escola de música é um documento em "escolas"
const schoolsRef = collection(firestore, "escolas")

export type SchoolInput = Omit<School, "id">

export async function listSchools(): Promise<School[]> {
    const snapshot = await getDocs(schoolsRef)
    return snapshot.docs
        .map((document) => {
            const data = document.data()
            return {
                id: document.id,
                name: data.name,
                address: data.address ?? "",
                latitude: data.latitude,
                longitude: data.longitude,
                radiusMeters: data.radiusMeters,
            }
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

/** Sem id cria uma escola nova; com id atualiza a existente */
export async function saveSchool(school: SchoolInput, id?: string): Promise<void> {
    if (id) {
        await setDoc(doc(schoolsRef, id), school)
    } else {
        await addDoc(schoolsRef, school)
    }
}
