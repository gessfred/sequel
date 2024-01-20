import { Fragment, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Dropdown from '../components/Dropdown'
import uniqid from 'uniqid'

const engines = {
  postgres: {
    id: 'postgres',
    name: 'PostgresSQL',
    avatar: 'https://wiki.postgresql.org/images/3/30/PostgreSQL_logo.3colors.120x120.png',
  }
}

export { engines }

export function Input({name, value, setValue}) {
    const hint = false
    return (
      <div>
        <label htmlFor="price" className="block text-sm font-medium leading-6 text-gray-900">
          {name}
        </label>
        <div className="relative mt-2 rounded-md shadow-sm">
          {hint && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>}
          <input
            type="text"
            name="price"
            id="price"
            className="block w-full rounded-md border-0 py-1.5 pl-7 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={value}
            onChange={e => setValue(e.target.value)}
          />
        </div>
      </div>
    )
}
  
export default function ConnectionEditor({api, show, onHide, onCreate}) {
  const [connection, setConnection] = useState({engine: Object.values(engines)[0]})
  const cancelButtonRef = useRef(null)
  const setConnectionProperty = property => value => setConnection(prev => Object.assign({}, prev, {[property]: value}))
  const createConnection = () => {
    api.userdata.datasources.write(Object.assign({}, connection, {datasource_id: uniqid()}, {engine: connection.engine.id}), {success: () => onCreate()})
  }
  console.log('connection', connection)
  return (
    <Transition.Root show={show} as={Fragment}>
      <Dialog as="div" className="relative z-10" initialFocus={cancelButtonRef} onClose={onHide}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        New connection
                      </Dialog.Title>
                      <div className="mt-2">
                        <Dropdown name="Engine" items={Object.values(engines)} selected={connection.engine} setSelected={setConnectionProperty('engine')} />
                        <Input name="Name" value={connection.name} setValue={setConnectionProperty('name')} />
                        <Input name="Connection String" value={connection.connection_string} setValue={setConnectionProperty('connection_string')} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={createConnection}
                    ref={cancelButtonRef}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    onClick={() => onHide()}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
