'use client'

import { ColDef, CsvExportModule, GridReadyEvent, RowNode, themeQuartz } from 'ag-grid-community'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { DatagridProps } from './logics/templates'

ModuleRegistry.registerModules([AllCommunityModule, CsvExportModule, CsvExportModule])

export const CustomTooltip = (props: any) => {
  return (
    <div className=" text-stone-500 seedstars-paragraph bg-white p-2 rounded-lg shadow-lg max-w-xs">
      {props.value}
    </div>
  )
}

const DatagridTemplate = ({
  ref,
  columns,
  data,
  enablePagination = false,
  recordSelection = false,
  paginationPageSize = 200,
  selectionType = 'singleRow',
  rowClassRules,
  cellClassRules,
  handleRowClick,
  handleCellChange,
  handleRowSelectonClick,
  enableCheckboxes = true,
  enableClickSelection = true,
  containerHeight,
  containerStyles,
  gridHeight,
  pageSizeAuto = false,
  paginationPageSizeSelector = [200, 500, 1000],
  handlePageChanged,
  loadingIndicator,
}: DatagridProps) => {
  const gridRef = useRef<any>(null)
  const containerStyle = useMemo(() => ({ width: '100%', height: containerHeight ?? 500, ...containerStyles }), [containerHeight])
  const gridStyle = useMemo(() => ({ height: gridHeight ?? '100%', width: '100%',...containerStyles }), [gridHeight])
  // const paginationPageSizeSelector = [200, 500, 1000]

  const defaultColDef = useMemo(() => {
    return {
      filter: true, //"agTextColumnFilter",
      // floatingFilter: true,
      
      sortable: true,
      resizable: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      enableCellChangeFlash: true,
      tooltipComponent: CustomTooltip,
      cellClass: (params: any) => {
        if (params.column.getColDef().wrapText) {
          return 'seedstars-paragraph  leading-tight flex  items-center' // Apply custom class
        }
        return 'seedstars-paragraph align-left'
      },
      headerClass: 'seedstars-paragraph text-endeavour',
    }
  }, [])

  const onCellValueChanged = useCallback(
    (event: { data: any }) => {
      handleCellChange && handleCellChange(event.data)
    },
    [handleCellChange]
  )

  // Export functions
  // const onBtnExport = useCallback(() => {
  //   gridRef.current.api.exportDataAsCsv()
  // }, [])

  const onSelectionChanged = () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() // Get selected row nodes
    const selectedData = selectedNodes?.map((node: RowNode) => node.data) // Map nodes to data
    console.log('Selected Data:', selectedData)
    handleRowSelectonClick && handleRowSelectonClick(selectedData)
  }

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridRef.current.api.redrawRows()
  }, [])

  return (
    <div className="ag " style={containerStyle}>
      {/* <ButtonTemplate handleClick={onBtnExport} /> */}
      <div style={gridStyle}>
        <AgGridReact
        enableCellSpan={true}
          ref={gridRef}
          // onGridReady={onGridReady}
          loading={loadingIndicator}
          // localeText={}
          // debug={true}
         
          theme={themeQuartz}
          rowData={data || []}
          columnDefs={columns || []}
          defaultColDef={defaultColDef}
          rowDragManaged={true}
          domLayout="normal"
          selectionColumnDef={{
            sortable: false,
            resizable: false,
            width: 50,
            suppressHeaderMenuButton: false,
            pinned: 'left',
          }}
          rowSelection={{
            mode: selectionType,
            headerCheckbox: enableCheckboxes,
            enableClickSelection: enableClickSelection,
            checkboxes: enableCheckboxes,
            selectAll: 'all',
          }}
          onSelectionChanged={onSelectionChanged} //use this to get the selected rows if it is mutiple selections
          onRowClicked={(data) => {
            const rowData = data.data
            handleRowClick && handleRowClick(rowData)
          }} //use this to get the selected row if it is single selection
          onCellValueChanged={onCellValueChanged}
          
          // tooltipShowDelay={0}
          // tooltipHideDelay={2000} //hides in 2 seconds
          suppressServerSideFullWidthLoadingRow={true}
          tooltipMouseTrack={true}
          pagination={enablePagination}
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={paginationPageSizeSelector}
          onPaginationChanged={handlePageChanged}
          paginationAutoPageSize={pageSizeAuto}
         
        />
      </div>
    </div>
  )
}

export default DatagridTemplate
