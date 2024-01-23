import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Bar } from '@visx/shape'
import { Group } from '@visx/group'
import { GradientTealBlue } from '@visx/gradient'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Grid } from '@visx/grid'
import { AxisBottom } from '@visx/axis'
import { timeParse, timeFormat } from '@visx/vendor/d3-time-format'

const verticalMargin = 64

function useSvgDimensions() {
  const ref = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (ref.current) {
      const { width, height } = ref.current.getBoundingClientRect()
      setDimensions({ width, height })
    }
  }, [])

  return [ref, dimensions]
}

const parseDate = timeParse('%Y-%m-%d');
const format = timeFormat('%h %m');
const formatDate = (date) => format(parseDate(date))

export default function Chart({ data, axes }) {
  const data_ = data || []
  const [svgRef, dimensions] = useSvgDimensions()
  const width = dimensions.width
  const height = dimensions.height - verticalMargin
  const xMax = width 
  const yMax = height
  console.log(data_, axes)
  // scales, memoize for performance
  const xScale = useMemo(
    () => scaleBand({
      range: [0, xMax],
      round: true,
      domain: data_?.map(it => (axes?.x in it) && it[axes?.x]),
      padding: 0.4,
    }),
    [xMax, JSON.stringify(data)]
  )
  const yScale = useMemo(
    () => scaleLinear({
      range: [yMax, 0],
      round: true,
      domain: [0, Math.max(...data_?.map(it => (axes?.y in it) && it[axes?.y]))],
    }),
    [yMax, JSON.stringify(data)],
  )
  console.log("dim", dimensions)
  console.log("drawing", data_)
  console.log("xaxis", data_?.map(it => (axes?.x in it) && it[axes?.x]))
  console.log("yaxis", [0, Math.max(...data_?.map(it => (axes?.y in it) && it[axes?.y]))])
  if(!data || !axes) return null
  return (
    <svg className='w-full h-200 bg-slate-200 rounded-md' ref={svgRef}>
      <rect height="150px" width="100%" fill="url(#teal)" rx={14} />
      {false && <Grid
          top={8}
          left={64}
          xScale={xScale}
          yScale={yScale}
          width={width - 128}
          height={yMax}
          stroke="black"
          strokeOpacity={0.1}
        />}
      <Group top={verticalMargin / 2}>
        {data_?.map(({x, y}) => {
          const barWidth = xScale.bandwidth();
          const barHeight = yMax - (yScale(y) ?? 0);
          const barX = xScale(x);
          const barY = yMax - barHeight;
          return (
            <Bar
              key={`bar-${x}`}
              x={barX}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill='dodgerblue'
              onClick={() => {
                console.log("clicked graph")
              }}
            />
            
          )
        })}
      </Group>
      {false && <AxisBottom
          top={yMax + 20}
          scale={xScale}
          stroke={'purple'}
          tickStroke={'purple'}
          tickFormat={formatDate}
          tickLabelProps={{
            fill: 'purple',
            fontSize: 11,
            textAnchor: 'middle',
          }}
        />}
    </svg>
  );
}
//<GradientTealBlue id="teal" />