import { useState } from "react"
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { Input } from "@/components/Input"
import { Screen } from "@/components/Screen"
import { EmptyState, ErrorView, LoadingView, Notice } from "@/components/StateViews"
import { useAddTeacher, useSchools, useTeachers, useSaveSchool, useToggleTeacher } from "@/hooks/queries"
import { Coords, describeCoords, geocodeAddress, getCurrentCoords, LocationPermissionError } from "@/services/locationService"
import { colors, radius } from "@/theme/colors"
import { School } from "@/types"
import { formatDistance } from "@/utils/distance"
import { getErrorMessage } from "@/utils/errors"

const MIN_RADIUS = 20
const MAX_RADIUS = 2000

function showLocationError(error: unknown) {
    const buttons =
        error instanceof LocationPermissionError
            ? [{ text: "Cancelar" }, { text: "Abrir configurações", onPress: () => Linking.openSettings() }]
            : undefined
    Alert.alert("Localização", getErrorMessage(error), buttons)
}

type FormProps = {
    /** Escola sendo editada; sem ela o formulário cadastra uma nova */
    editing: School | null
    onDone: () => void
}

function SchoolForm({ editing, onDone }: FormProps) {
    const saveSchool = useSaveSchool()
    const [name, setName] = useState(editing?.name ?? "")
    const [address, setAddress] = useState(editing?.address ?? "")
    const [radiusText, setRadiusText] = useState(String(editing?.radiusMeters ?? 150))
    const [coords, setCoords] = useState<Coords | null>(
        editing ? { latitude: editing.latitude, longitude: editing.longitude } : null
    )
    const [locating, setLocating] = useState<"address" | "gps" | null>(null)
    const [errors, setErrors] = useState<{ name?: string; address?: string; radius?: string; coords?: string }>({})

    function changeAddress(text: string) {
        setAddress(text)
        setCoords(null) // o endereço mudou: precisa buscar de novo
    }

    async function searchAddress() {
        if (address.trim().length < 5) {
            setErrors((current) => ({ ...current, address: "Digite o endereço com número e cidade." }))
            return
        }
        setLocating("address")
        try {
            setCoords(await geocodeAddress(address.trim()))
            setErrors((current) => ({ ...current, address: undefined, coords: undefined }))
        } catch (error) {
            showLocationError(error)
        } finally {
            setLocating(null)
        }
    }

    async function fillWithCurrentLocation() {
        setLocating("gps")
        try {
            const current = await getCurrentCoords()
            setCoords(current)
            const found = await describeCoords(current)
            if (found) setAddress(found)
            setErrors((previous) => ({ ...previous, address: undefined, coords: undefined }))
        } catch (error) {
            showLocationError(error)
        } finally {
            setLocating(null)
        }
    }

    function handleSave() {
        const radiusMeters = Number(radiusText)
        const next: typeof errors = {}
        if (name.trim().length < 2) next.name = "Informe o nome da escola."
        if (!Number.isInteger(radiusMeters) || radiusMeters < MIN_RADIUS || radiusMeters > MAX_RADIUS) {
            next.radius = `Use um número inteiro entre ${MIN_RADIUS} e ${MAX_RADIUS}.`
        }
        if (!coords) next.coords = "Busque o endereço ou use a localização atual."
        setErrors(next)
        if (Object.keys(next).length > 0 || !coords) return

        saveSchool.mutate(
            {
                id: editing?.id,
                school: {
                    name: name.trim(),
                    address: address.trim(),
                    radiusMeters,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                },
            },
            {
                onSuccess: () => {
                    Alert.alert(
                        editing ? "Escola atualizada" : "Escola cadastrada",
                        "Os alunos já podem fazer check-in nesta unidade."
                    )
                    onDone()
                },
                onError: (error) => Alert.alert("Não foi possível salvar", getErrorMessage(error)),
            }
        )
    }

    return (
        <Card title={editing ? `Editar ${editing.name}` : "Nova escola"}>
            <Input label="Nome da escola" placeholder="Ex.: Escola Vila Mariana" value={name} onChangeText={setName} error={errors.name} />
            <Input
                label="Endereço"
                placeholder="Ex.: R. Domingos de Morais, 2564 - São Paulo - SP"
                value={address}
                onChangeText={changeAddress}
                error={errors.address}
            />
            <Button
                title="Buscar endereço"
                variant="secondary"
                onPress={searchAddress}
                loading={locating === "address"}
                disabled={locating !== null}
            />
            <Button
                title="Usar minha localização atual"
                variant="secondary"
                onPress={fillWithCurrentLocation}
                loading={locating === "gps"}
                disabled={locating !== null}
            />

            <View style={styles.location}>
                <Text style={styles.locationLabel}>Coordenadas</Text>
                <Text style={[styles.locationValue, errors.coords ? styles.locationError : null]}>
                    {coords
                        ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                        : errors.coords ?? "Ainda não definidas"}
                </Text>
            </View>

            <Input
                label="Raio permitido (metros)"
                placeholder="150"
                keyboardType="number-pad"
                value={radiusText}
                onChangeText={setRadiusText}
                error={errors.radius}
            />

            <Button
                title={editing ? "Salvar alterações" : "Cadastrar escola"}
                onPress={handleSave}
                loading={saveSchool.isPending}
                disabled={locating !== null}
            />
            {editing ? <Button title="Cancelar edição" variant="secondary" onPress={onDone} /> : null}
        </Card>
    )
}

function SchoolsSection() {
    const schools = useSchools()
    const [editing, setEditing] = useState<School | null>(null)
    // Muda a cada salvar/cancelar para o formulário começar limpo
    const [formKey, setFormKey] = useState(0)

    function finishForm() {
        setEditing(null)
        setFormKey((current) => current + 1)
    }

    function startEditing(school: School) {
        setEditing(school)
        setFormKey((current) => current + 1)
    }

    return (
        <>
            <Card title="Escolas">
                {schools.isPending ? (
                    <View style={styles.loading}>
                        <LoadingView />
                    </View>
                ) : schools.error ? (
                    <ErrorView
                        message={getErrorMessage(schools.error, "Não foi possível carregar as escolas.")}
                        onRetry={() => schools.refetch()}
                    />
                ) : schools.data.length === 0 ? (
                    <Notice
                        tone="warning"
                        icon="alert-circle"
                        message="Nenhuma escola cadastrada. Os alunos não conseguem fazer check-in."
                    />
                ) : (
                    schools.data.map((item, index) => (
                        <View key={item.id}>
                            {index > 0 ? <View style={styles.divider} /> : null}
                            <View style={styles.school}>
                                <View style={styles.schoolIcon}>
                                    <Ionicons name="musical-notes" size={18} color={colors.accent} />
                                </View>
                                <View style={styles.texts}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemInfo}>
                                        {[item.address, `raio de ${formatDistance(item.radiusMeters)}`].filter(Boolean).join(" · ")}
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => startEditing(item)}
                                    style={styles.editButton}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Editar ${item.name}`}
                                >
                                    <Ionicons name="create-outline" size={20} color={colors.accent} />
                                </Pressable>
                            </View>
                        </View>
                    ))
                )}
            </Card>

            <SchoolForm key={formKey} editing={editing} onDone={finishForm} />
        </>
    )
}

function TeachersSection() {
    const teachers = useTeachers()
    const addTeacher = useAddTeacher()
    const toggleTeacher = useToggleTeacher()
    const [name, setName] = useState("")
    const [instrument, setInstrument] = useState("")
    const [nameError, setNameError] = useState<string>()

    function handleAdd() {
        if (name.trim().length < 2) {
            setNameError("Informe o nome do professor.")
            return
        }
        setNameError(undefined)
        addTeacher.mutate(
            { name, instrument },
            {
                onSuccess: () => {
                    Alert.alert("Professor cadastrado", `${name.trim()} já aparece para os alunos no check-in.`)
                    setName("")
                    setInstrument("")
                },
                onError: (error) => Alert.alert("Não foi possível cadastrar", getErrorMessage(error)),
            }
        )
    }

    function handleToggle(id: string) {
        const teacher = teachers.data?.find((item) => item.id === id)
        if (!teacher) return
        toggleTeacher.mutate(teacher, {
            onError: (error) => Alert.alert("Não foi possível alterar", getErrorMessage(error)),
        })
    }

    return (
        <Card title="Professores">
            <Input label="Nome" placeholder="Ex.: Rafael Lima" value={name} onChangeText={setName} error={nameError} />
            <Input label="Instrumento (opcional)" placeholder="Ex.: Violão" value={instrument} onChangeText={setInstrument} />
            <Button title="Adicionar professor" onPress={handleAdd} loading={addTeacher.isPending} />

            <View style={styles.divider} />

            {teachers.isPending ? (
                <View style={styles.loading}>
                    <LoadingView />
                </View>
            ) : teachers.error ? (
                <ErrorView
                    message={getErrorMessage(teachers.error, "Não foi possível carregar os professores.")}
                    onRetry={() => teachers.refetch()}
                />
            ) : teachers.data.length === 0 ? (
                <EmptyState
                    icon="people-outline"
                    title="Nenhum professor"
                    description="Cadastre quem dá as aulas para os alunos escolherem no check-in."
                />
            ) : (
                teachers.data.map((item) => {
                    const updating = toggleTeacher.isPending && toggleTeacher.variables?.id === item.id
                    return (
                        <View key={item.id} style={styles.teacher}>
                            <View style={styles.texts}>
                                <Text style={[styles.itemName, !item.active && styles.inactive]}>{item.name}</Text>
                                <Text style={styles.itemInfo}>
                                    {[item.instrument, item.active ? "Ativo" : "Inativo"].filter(Boolean).join(" · ")}
                                </Text>
                            </View>
                            <Switch
                                value={item.active}
                                onValueChange={() => handleToggle(item.id)}
                                disabled={updating}
                                trackColor={{ true: colors.accent, false: colors.lineStrong }}
                                thumbColor={colors.surface}
                                accessibilityLabel={`${item.active ? "Desativar" : "Ativar"} ${item.name}`}
                            />
                        </View>
                    )
                })
            )}
        </Card>
    )
}

export default function SchoolScreen() {
    const schools = useSchools()
    const teachers = useTeachers()

    function refetchAll() {
        schools.refetch()
        teachers.refetch()
    }

    return (
        <Screen
            title="Escolas"
            subtitle="Unidades de check-in e professores"
            refreshing={schools.isRefetching || teachers.isRefetching}
            onRefresh={refetchAll}
        >
            <SchoolsSection />
            <TeachersSection />
        </Screen>
    )
}

const styles = StyleSheet.create({
    location: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
    locationLabel: { fontSize: 13, fontWeight: "600", color: colors.ink2 },
    locationValue: { flex: 1, textAlign: "right", fontSize: 14, color: colors.ink, fontVariant: ["tabular-nums"] },
    locationError: { color: colors.danger },
    divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
    loading: { height: 120 },
    school: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
    schoolIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accentSoft,
        alignItems: "center",
        justifyContent: "center",
    },
    editButton: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
    teacher: { flexDirection: "row", alignItems: "center", gap: 12 },
    texts: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: "700", color: colors.ink },
    itemInfo: { fontSize: 13, color: colors.ink2, marginTop: 1 },
    inactive: { color: colors.ink3 },
})
