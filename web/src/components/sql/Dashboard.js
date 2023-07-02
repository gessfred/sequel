import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export function Dashboard({type, data}) {
  const svgRef = useRef(null)

  useEffect(() => {
    // D3 code for creating the plot
    const svg = d3.select(svgRef.current);

    // Sample data
    const data = [10, 20, 30, 40, 50];

    // Create the bars
    svg
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d, i) => i * 50)
      .attr('y', (d) => 150 - d * 2)
      .attr('width', 40)
      .attr('height', (d) => d * 2)
      .attr('fill', 'steelblue')
  }, [])

  return (
    <svg ref={svgRef} width={500} height={200}>
      {/* Add any other SVG elements or components here */}
    </svg>
  )
}