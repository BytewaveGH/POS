"use client"

import React, { useState } from 'react'
import { AgCharts } from "ag-charts-react";
import { AgBarSeriesOptions, AgChartOptions } from "ag-charts-community";
import { ChartProps } from './logics/templates';

const ChartTemplate = ({ chartType = "bar" }: ChartProps) => {

    const [chartOptions, setChartOptions] = useState<AgChartOptions>({
        // Data: Data to be displayed in the chart
        data: [
            { month: 'Jan', avgTemp: 2.3, iceCreamSales: 162000 },
            { month: 'Mar', avgTemp: 6.3, iceCreamSales: 302000 },
            { month: 'May', avgTemp: 16.2, iceCreamSales: 800000 },
            { month: 'Jul', avgTemp: 22.8, iceCreamSales: 1254000 },
            { month: 'Sep', avgTemp: 14.5, iceCreamSales: 950000 },
            { month: 'Nov', avgTemp: 8.9, iceCreamSales: 200000 },
        ],
        // Series: Defines which chart type and data to use
        series: [
            {
                title: "Temperature",
                type: chartType,
                xKey: 'month',
                yKey: 'iceCreamSales',
                yName: "iceCreamSales",
                legendItemName: "iceCreamSales",
                showInLegend: true,
                interpolation: {
                    type: 'smooth'
                },
                marker: {
                    fill: "orange",
                    size: 10,
                    stroke: "black",
                    strokeWidth: 3,
                    shape: "diamond",
                },
                label: {
                    enabled: true,
                    fontWeight: 'bold',
                },
            },

        ],
        legend: {
            position: "bottom",
            item: {
                maxWidth: 130,
                paddingX: 32,
                paddingY: 4,
                marker: {
                    padding: 8,
                },
                label: {
                    fontSize: 14,
                    fontFamily: 'Papyrus',
                    color: 'red',
                    maxLength: 12,
                    formatter: ({value}) => value == "Coal" ? value + " *" : value
                },
                line: {
                    strokeWidth: 4,
                    length: 40, //20 for the marker and 10 on each side
                },
            }
          },
    });

    return (
        <div className='w-full'>
            <AgCharts className='h-full' options={chartOptions} />
        </div>
    )
}

export default ChartTemplate