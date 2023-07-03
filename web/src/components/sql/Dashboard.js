import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import './Dashboard.css'

export function Dashboard({type, data, labels, width, height}) {
  const svgRef = useRef(null)
  useEffect(() => {
    const xlabels = labels ? labels : data.map((x, i) => i)
    console.log(xlabels)
    const svg = d3.select(svgRef.current)
    svg.attr("transform", "translate(" + 20 + "," + 20 + ")")

    const maxValue = d3.max(data);
    const xScale = d3.scaleBand()
      .domain(xlabels)
      .range([0, width])
      .paddingInner(0.1) // Adjust the inner padding between bars
      .paddingOuter(0.2)
    // Create a linear scale for the y-axis
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([height, 0])
    // Set the ranges
    svg.selectAll('rect').remove()
    svg.selectAll('g').remove()
    svg
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr("class", "bar")
      //.attr('x', (d, i) => i * (barWidth + spacing))
      .attr('y', (d) => yScale(d)) // 20 + height - height * d / highest
      //.attr('width', barWidth)
      .attr("x", (d, i) => xScale(xlabels[i]))
      .attr("width", xScale.bandwidth())
      .attr('height', (d) =>  height - yScale(d))
      .attr('fill', 'steelblue')
      const xAxis = d3.axisBottom(xScale)
      if(labels) {
        xAxis.ticks(labels.length)
      }
      svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    const yAxis = d3.axisLeft(yScale).ticks(8)
    yAxis.tickSize(0)
    svg.append("g")
    .call(yAxis)
  }, [data])
/**
 *       .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
 */
  return (
    <div className='dashboard-container'>
      <svg ref={svgRef} width={width+50} height={height+ 50}>
        {/* Add any other SVG elements or components here */}
      </svg>
    </div>
  )
}