"use client"

import { useAxios } from "@/hooks/use-axios"
import { UnitServices } from "./services"


const request = useAxios()

export const handleCreateUnit = async(payload: any, params?: any) => {
    try {
        const response = await request(UnitServices.Create(payload))

        return response
    } catch (error) {
        console.warn(error)
    }
}