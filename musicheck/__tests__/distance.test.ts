import { distanceInMeters, formatDistance } from "@/utils/distance"

const ESCOLA_VILA_MARIANA = { latitude: -23.5893, longitude: -46.6347 }
const METRO_ANA_ROSA = { latitude: -23.5812, longitude: -46.6382 }
const PARQUE_IBIRAPUERA = { latitude: -23.5874, longitude: -46.6576 }
// Posição padrão do emulador Android (sede do Google, Califórnia)
const EMULADOR_PADRAO = { latitude: 37.421998, longitude: -122.084 }

describe("distanceInMeters", () => {
    it("é zero para o mesmo ponto", () => {
        expect(distanceInMeters(ESCOLA_VILA_MARIANA, ESCOLA_VILA_MARIANA)).toBe(0)
    })

    it("é igual nos dois sentidos", () => {
        expect(distanceInMeters(ESCOLA_VILA_MARIANA, PARQUE_IBIRAPUERA)).toBeCloseTo(
            distanceInMeters(PARQUE_IBIRAPUERA, ESCOLA_VILA_MARIANA),
            6
        )
    })

    it("mede distâncias curtas dentro de São Paulo", () => {
        // Escola Vila Mariana → Metrô Ana Rosa: uns 970 m
        expect(distanceInMeters(ESCOLA_VILA_MARIANA, METRO_ANA_ROSA)).toBeGreaterThan(900)
        expect(distanceInMeters(ESCOLA_VILA_MARIANA, METRO_ANA_ROSA)).toBeLessThan(1_050)
        // Escola Vila Mariana → Parque Ibirapuera: uns 2,3 km
        expect(distanceInMeters(ESCOLA_VILA_MARIANA, PARQUE_IBIRAPUERA)).toBeGreaterThan(2_150)
        expect(distanceInMeters(ESCOLA_VILA_MARIANA, PARQUE_IBIRAPUERA)).toBeLessThan(2_550)
    })

    it("explica os ~10.000 km vistos no emulador sem GPS configurado", () => {
        const km = distanceInMeters(ESCOLA_VILA_MARIANA, EMULADOR_PADRAO) / 1000
        expect(km).toBeGreaterThan(10_000)
        expect(km).toBeLessThan(10_800)
    })
})

describe("formatDistance", () => {
    it("usa metros abaixo de 1 km", () => {
        expect(formatDistance(0)).toBe("0 m")
        expect(formatDistance(149.6)).toBe("150 m")
        expect(formatDistance(999)).toBe("999 m")
    })

    it("usa km com vírgula a partir de 1 km", () => {
        expect(formatDistance(1000)).toBe("1,0 km")
        expect(formatDistance(2345)).toBe("2,3 km")
    })
})
