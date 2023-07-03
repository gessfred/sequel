import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import './Dashboard.css'

export function Dashboard({type, data}) {
  console.log(data)
  const svgRef = useRef(null)

  useEffect(() => {
    console.log('rendering')
    const svg = d3.select(svgRef.current)
    svg.selectAll('rect').remove()
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
  }, [data])

  return (
    <div className='dashboard-container'>
      <svg ref={svgRef} width={500} height={200}>
        {/* Add any other SVG elements or components here */}
      </svg>
    </div>
  )
}