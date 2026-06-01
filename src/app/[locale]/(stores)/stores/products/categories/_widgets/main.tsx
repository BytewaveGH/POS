"use client"

import ButtonTemplate from '@/components/templates/button'
import DatagridTemplate from '@/components/templates/datagrid'
import { SheetTemplate } from '@/components/templates/sheet'
import { UpdateStates } from '@/lib/functions/update-states'
import React, { useMemo, useState } from 'react'
import CreateUnit from './_forns/create-unit'
import CreateWarehouse from './_forns/create-category'
import { useFetchData } from '@/hooks/use-fetch'
import { UnitServices, WarehouseServices } from '../_logics/services'
import { IGeneric } from '@/types/interfaces'
import { useAxios } from '@/hooks/use-axios'

const Main = () => {
    const request = useAxios()

    const [states, setStates] = useState<{
        mode: 'unit' | 'warehouse'
        isModalOpen: boolean
        selectedUnit: any | null
        selectedWarehouse: any | null
    }>({
        mode: 'unit',
        isModalOpen: false,
        selectedUnit: null,
        selectedWarehouse: null,
    })

    const { data: units, isLoading: unitsLoading, refetch: refetchUnits } = useFetchData(
        'units',
        UnitServices.FetchAll() as unknown as IGeneric
    )

    const { data: warehouses, isLoading: warehousesLoading, refetch: refetchWarehouses } = useFetchData(
        'warehouses',
        WarehouseServices.FetchAll() as unknown as IGeneric
    )

    const handleDeleteUnit = async (id: number) => {
        try {
            await request(UnitServices.Delete(id))
            refetchUnits()
        } catch (err) {
            console.error('Delete unit failed:', err)
        }
    }

    const handleDeleteWarehouse = async (id: number) => {
        try {
            await request(WarehouseServices.Delete(id))
            refetchWarehouses()
        } catch (err) {
            console.error('Delete warehouse failed:', err)
        }
    }

    const unitCols = useMemo(() => [
        { field: 'id', headerName: 'ID' },
        { field: 'name', headerName: 'Unit Name' },
        {
            field: 'actions',
            headerName: '',
            pinned: 'right' as const,
            sortable: false,
            filter: false,
            cellRenderer: ({ data }: any) => (
                <div className="flex items-center gap-1 h-full">
                    <button
                        className="text-xs text-endeavour hover:underline"
                        onClick={() => setStates(s => ({ ...s, selectedUnit: data, mode: 'unit', isModalOpen: true }))}
                    >
                        Edit
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => handleDeleteUnit(data.id)}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ], [])

    const warehouseCols = useMemo(() => [
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Warehouse Name', flex: 1 },
        { field: 'address', headerName: 'Address', flex: 1 },
        {
            field: 'actions',
            headerName: '',
            width: 110,
            pinned: 'right' as const,
            sortable: false,
            filter: false,
            cellRenderer: ({ data }: any) => (
                <div className="flex items-center gap-1 h-full">
                    <button
                        className="text-xs text-endeavour hover:underline"
                        onClick={() => setStates(s => ({ ...s, selectedWarehouse: data, mode: 'warehouse', isModalOpen: true }))}
                    >
                        Edit
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => handleDeleteWarehouse(data.id)}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ], [])

    return (
        <div className='w-full h-full flex space-x-2'>

            <SheetTemplate
                open={states.isModalOpen}
                handleOpen={() => UpdateStates(setStates, 'isModalOpen', true)}
                handleClose={() => setStates(s => ({ ...s, isModalOpen: false, selectedUnit: null, selectedWarehouse: null }))}
                title={
                    states.mode === 'unit'
                        ? states.selectedUnit ? 'Edit Unit' : 'Add Unit'
                        : states.selectedWarehouse ? 'Edit Warehouse' : 'Add Warehouse'
                }
                contentBodyClassName="flex flex-col"
                content={
                    states.mode === 'unit'
                        ? (
                            <CreateUnit
                                mode={states.selectedUnit ? 'update' : 'create'}
                                unitId={states.selectedUnit?.id}
                                initialData={states.selectedUnit ?? undefined}
                                onSuccess={() => {
                                    refetchUnits()
                                    setStates(s => ({ ...s, isModalOpen: false, selectedUnit: null }))
                                }}
                            />
                        )
                        : (
                            <CreateWarehouse
                                mode={states.selectedWarehouse ? 'update' : 'create'}
                                warehouseId={states.selectedWarehouse?.id}
                                initialData={states.selectedWarehouse ?? undefined}
                                onSuccess={() => {
                                    refetchWarehouses()
                                    setStates(s => ({ ...s, isModalOpen: false, selectedWarehouse: null }))
                                }}
                            />
                        )
                }
            />

            {/* Units */}
            <div className='w-full h-full'>
                <nav className='w-full'>
                    <aside className='w-full flex justify-between items-center p-4'>
                        <div>
                            <h2 className='bytewave-heading text-base'>Units</h2>
                            <p className='bytewave-paragraph text-xs'>Manage selling units</p>
                        </div>
                        <ButtonTemplate
                            isText
                            text='Add Unit'
                            handleClick={() => setStates(s => ({ ...s, mode: 'unit', selectedUnit: null, isModalOpen: true }))}
                        />
                    </aside>
                </nav>
                <DatagridTemplate
                    columns={unitCols}
                    data={(units as unknown as any[]) ?? []}
                    loadingIndicator={unitsLoading}
                    enablePagination
                    paginationPageSize={20}
                    paginationPageSizeSelector={[10, 20, 50]}
                    selectionType='singleRow'
                />
            </div>

            {/* Warehouses */}
            <div className='w-full h-full'>
                <nav className='w-full'>
                    <aside className='w-full flex justify-between items-center p-4'>
                        <div>
                            <h2 className='bytewave-heading text-base'>Warehouses</h2>
                            <p className='bytewave-paragraph text-xs'>Manage warehouse locations</p>
                        </div>
                        <ButtonTemplate
                            isText
                            text='Add Warehouse'
                            handleClick={() => setStates(s => ({ ...s, mode: 'warehouse', selectedWarehouse: null, isModalOpen: true }))}
                        />
                    </aside>
                </nav>
                <DatagridTemplate
                    columns={warehouseCols}
                    data={(warehouses as unknown as any[]) ?? []}
                    loadingIndicator={warehousesLoading}
                    enablePagination
                    paginationPageSize={20}
                    paginationPageSizeSelector={[10, 20, 50]}
                    selectionType='singleRow'
                />
            </div>
        </div>
    )
}

export default Main
