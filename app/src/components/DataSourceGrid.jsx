import { CodeBracketIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/20/solid'

const people = [
  {
    name: 'Jane Cooper',
    title: 'Regional Paradigm Technician',
    role: 'Admin',
    email: 'janecooper@example.com',
    telephone: '+1-202-555-0170',
    imageUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=4&w=256&h=256&q=60',
  },
  // More people...
]

export default function DataSourceGrid({datasources, createWorksheet, editDataSource}) {
  return (
    <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {(datasources || []).map((ds) => (
        <li key={ds} className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow">
          <div className="flex w-full items-center justify-between space-x-6 p-6">
            <div className="flex-1 truncate">
              <div className="flex items-center space-x-3">
                <h3 className="truncate text-sm font-medium text-gray-900">{ds.name}</h3>
                <span className="inline-flex flex-shrink-0 items-center rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  {ds.name}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-gray-500">{ds.name}</p>
            </div>
            <img className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-300" src={ds.imageUrl} alt="" />
          </div>
          <div>
            <div className="-mt-px flex divide-x divide-gray-200">
              <div className="flex w-0 flex-1">
                <button
                  className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-900"
                  onClick={() => createWorksheet(ds)}
                >
                  <CodeBracketIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  Worksheet
                </button>
              </div>
              <div className="-ml-px flex w-0 flex-1">
                <button
                  className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-gray-900"
                  onClick={editDataSource}
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
