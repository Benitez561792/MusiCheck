import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/AuthContext"
import { createCheckin, listStudentCheckins, listWeekCheckins } from "@/services/checkinService"
import { getProfile } from "@/services/profileService"
import { listSchools, saveSchool, SchoolInput } from "@/services/schoolService"
import { addTeacher, listTeachers, setTeacherActive } from "@/services/teacherService"
import { Teacher } from "@/types"

// Chaves do cache do TanStack Query. Invalidar uma chave faz as telas buscarem de novo.
export const queryKeys = {
    profile: (uid: string) => ["profile", uid] as const,
    schools: ["schools"] as const,
    teachers: ["teachers"] as const,
    checkins: ["checkins"] as const,
    myCheckins: (uid: string) => ["checkins", "student", uid] as const,
    weekCheckins: (week: string) => ["checkins", "week", week] as const,
}

function useUid(): string {
    const { user } = useAuth()
    return user?.uid ?? ""
}

export function useProfile() {
    const uid = useUid()
    return useQuery({
        queryKey: queryKeys.profile(uid),
        queryFn: () => getProfile(uid),
        enabled: !!uid,
        // Logo após o cadastro o perfil pode ainda estar sendo gravado
        retry: 3,
        retryDelay: 800,
        staleTime: Infinity,
    })
}

export function useSchools() {
    return useQuery({ queryKey: queryKeys.schools, queryFn: listSchools })
}

export function useTeachers() {
    return useQuery({ queryKey: queryKeys.teachers, queryFn: listTeachers })
}

export function useMyCheckins() {
    const uid = useUid()
    return useQuery({
        queryKey: queryKeys.myCheckins(uid),
        queryFn: () => listStudentCheckins(uid),
        enabled: !!uid,
    })
}

export function useWeekCheckins(week: string) {
    return useQuery({ queryKey: queryKeys.weekCheckins(week), queryFn: () => listWeekCheckins(week) })
}

export function useCreateCheckin() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createCheckin,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.checkins }),
    })
}

export function useSaveSchool() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ school, id }: { school: SchoolInput; id?: string }) => saveSchool(school, id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.schools }),
    })
}

export function useAddTeacher() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ name, instrument }: { name: string; instrument: string }) => addTeacher(name, instrument),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.teachers }),
    })
}

export function useToggleTeacher() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (teacher: Teacher) => setTeacherActive(teacher.id, !teacher.active),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.teachers }),
    })
}
