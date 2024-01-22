import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Bar } from '@visx/shape'
import { Group } from '@visx/group'
import { GradientTealBlue } from '@visx/gradient'
import { scaleBand, scaleLinear } from '@visx/scale'

const verticalMargin = 120

function useSvgDimensions() {
  const ref = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (ref.current) {
      const { width, height } = ref.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  return [ref, dimensions];
}

export default function Chart({ data }) {
  const data_ = data || []
  const [svgRef, dimensions] = useSvgDimensions()
  const xMax = dimensions.width;
  const yMax = dimensions.height - verticalMargin;
  // scales, memoize for performance
  const xScale = useMemo(
    () => scaleBand({
      range: [0, xMax],
      round: true,
      domain: data_?.map(x => x.x),
      padding: 0.4,
    }),
    [xMax, JSON.stringify(data)]
  )
  const yScale = useMemo(
    () => scaleLinear({
      range: [yMax, 0],
      round: true,
      domain: [0, Math.max(...data_?.map(x => x.y))],
    }),
    [yMax, JSON.stringify(data)],
  )
  console.log("drawing", data_, dimensions)
  if(!data) return null
  return (
    <svg className='w-full h-200' ref={svgRef}>
      <GradientTealBlue id="teal" />
      <rect height="150px" width="100%" fill="url(#teal)" rx={14} />
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
              fill="rgba(23, 233, 217, .5)"
              onClick={() => {
                console.log("clicked graph")
              }}
            />
          );
        })}
      </Group>
    </svg>
  );
}