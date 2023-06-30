import './Table.css'

export function Table({data}) {
  if(!(data && data.columns && data.rows)) return ''
  return (
    <table className='query-results-table' cellPadding="8px">
      <thead>
        <tr className='table-header'>
          {data.columns.map((column, index) => (
            <th key={index}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
      {data.rows.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <td key={cellIndex}>{cell}</td>
          ))}
        </tr>
      ))}
    </tbody>
    </table>
  )
}