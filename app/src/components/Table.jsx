const transactions = [
    {
      id: 'AAPS0L',
      company: 'Chase & Co.',
      share: 'CAC',
      commission: '+$4.37',
      price: '$3,509.00',
      quantity: '12.00',
      netAmount: '$4,397.00',
    },
    // More transactions...
  ]
  
  export default function Table({columns, rows, metadata}) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    {(columns || []).map(column => (
                        <th
                        scope="col"
                        className="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                        {column}
                        </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(rows || []).map((row) => (
                    <tr key={row.id}>
                      {row.map(column => <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-900">{column}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }
  