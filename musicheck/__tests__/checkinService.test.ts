import { createCheckin } from "@/services/checkinService"
import { getCurrentCoords } from "@/services/locationService"
import { School, Teacher } from "@/types"
import { AppError } from "@/utils/errors"

// Firestore e GPS falsos: o teste controla a posição do aluno e se já existe check-in no dia
const mockTransaction = { get: jest.fn(), set: jest.fn() }

jest.mock("@/config/firebase", () => ({ firestore: {} }))
jest.mock("firebase/firestore", () => ({
    collection: jest.fn(() => ({})),
    doc: jest.fn((_ref: unknown, id: string) => ({ id })),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    serverTimestamp: jest.fn(() => "SERVER_TIME"),
    runTransaction: jest.fn((_db: unknown, run: (t: typeof mockTransaction) => Promise<void>) => run(mockTransaction)),
}))
jest.mock("@/services/locationService", () => ({ getCurrentCoords: jest.fn() }))

const mockedCoords = getCurrentCoords as jest.MockedFunction<typeof getCurrentCoords>

const vilaMariana: School = {
    id: "vila-mariana",
    name: "Escola Vila Mariana",
    address: "R. Domingos de Morais, 2564 - Vila Mariana - São Paulo - SP",
    latitude: -23.5893,
    longitude: -46.6347,
    radiusMeters: 150,
}
const teacher: Teacher = { id: "t1", name: "Rafael Lima", instrument: "Violão", active: true }
const input = { studentId: "uid123", studentName: "Aluno", teacher, school: vilaMariana }

beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.get.mockResolvedValue({ exists: () => false })
})

describe("createCheckin", () => {
    it("registra o check-in quando o aluno está dentro do raio", async () => {
        mockedCoords.mockResolvedValue({ latitude: -23.5894, longitude: -46.6348 }) // ~15 m da escola

        const checkin = await createCheckin(input)

        expect(checkin.id).toMatch(/^uid123_\d{4}-\d{2}-\d{2}$/)
        expect(checkin.schoolId).toBe("vila-mariana")
        expect(checkin.schoolName).toBe("Escola Vila Mariana")
        expect(checkin.teacherName).toBe("Rafael Lima")
        expect(checkin.week).toMatch(/^\d{4}-W\d{2}$/)
        expect(checkin.distanceMeters).toBeLessThan(150)
        expect(mockTransaction.set).toHaveBeenCalledWith(
            { id: checkin.id },
            expect.objectContaining({ studentId: "uid123", schoolId: "vila-mariana", createdAt: "SERVER_TIME" })
        )
    })

    it("recusa quando o aluno está longe e mostra a distância", async () => {
        mockedCoords.mockResolvedValue({ latitude: -23.5641, longitude: -46.6527 }) // Av. Paulista, ~3,3 km

        await expect(createCheckin(input)).rejects.toThrow(/Você está a \d+,\d km da Escola Vila Mariana/)
        expect(mockTransaction.set).not.toHaveBeenCalled()
    })

    it("recusa com a posição padrão do emulador (Califórnia)", async () => {
        mockedCoords.mockResolvedValue({ latitude: 37.421998, longitude: -122.084 })

        await expect(createCheckin(input)).rejects.toBeInstanceOf(AppError)
        expect(mockTransaction.set).not.toHaveBeenCalled()
    })

    it("aceita perto do limite do raio", async () => {
        // ~140 m ao norte da escola
        mockedCoords.mockResolvedValue({ latitude: vilaMariana.latitude + 0.00126, longitude: vilaMariana.longitude })

        await expect(createCheckin(input)).resolves.toMatchObject({ schoolId: "vila-mariana" })
    })

    it("recusa um segundo check-in no mesmo dia", async () => {
        mockedCoords.mockResolvedValue({ latitude: vilaMariana.latitude, longitude: vilaMariana.longitude })
        mockTransaction.get.mockResolvedValue({ exists: () => true })

        await expect(createCheckin(input)).rejects.toThrow("Você já fez check-in hoje")
        expect(mockTransaction.set).not.toHaveBeenCalled()
    })

    it("repassa o erro de localização sem gravar nada", async () => {
        mockedCoords.mockRejectedValue(new AppError("A localização do aparelho está desligada."))

        await expect(createCheckin(input)).rejects.toThrow("desligada")
        expect(mockTransaction.get).not.toHaveBeenCalled()
    })
})
