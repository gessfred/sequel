import { Fragment, useState, useEffect } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import ConnectionEditor from './ConnectionEditor'
import DataSourceGrid from '../components/DataSourceGrid'
import FilesExplorer from '../components/FilesExplorer'
import { CheckCircleIcon } from '@heroicons/react/20/solid'

const user = {
    name: 'Tom Cook',
    email: 'tom@example.com',
    imageUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  }
  const navigation = [
    { name: 'Dashboard', href: '#', current: true },
    { name: 'Team', href: '#', current: false },
    { name: 'Projects', href: '#', current: false },
    { name: 'Calendar', href: '#', current: false },
    { name: 'Reports', href: '#', current: false },
  ]
  const userNavigation = [
    { name: 'Your Profile', href: '#' },
    { name: 'Settings', href: '#' },
    { name: 'Sign out', href: '#' },
  ]
  
  function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
  }
  
  export default function Home({show, api, createNotebook,  onOpenFile}) {
    const [state, setState] = useState({notebooks: [], datasources: [], showConnectionEditor: false, worksheets: []})
    const setStateProperty = values => setState(p => Object.assign({}, p, values))
    useEffect(() => {
      if(api.auth.authenticated) {
        api.userdata.datasources.read(datasources => setState(prev => Object.assign({}, prev, {datasources: datasources || []})))
        api.userdata.notebooks.read(nbs => setState(prev => Object.assign({}, prev, {notebooks: nbs || []})))
      }
    }, [api.auth.authenticated, state.showConnectionEditor])
    console.log(state)
    if(!show) return <span></span>
    return (
      <>
        {/*
          This example requires updating your template:
  
          ```
          <html class="h-full bg-gray-100">
          <body class="h-full">
          ```
        */}
        <div className="min-h-full">
  
            <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
              <h1 className='font-medium'>Data Sources</h1>
              <div className='grid'>
                <DataSourceGrid  
                  datasources={state.datasources} 
                  createNotebook={createNotebook}
                />
              </div>
              <button
                type="button"
                onClick={() => setStateProperty({showConnectionEditor: true})}
                className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <CheckCircleIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                Create
              </button>
              <ConnectionEditor 
                show={state.showConnectionEditor} 
                onHide={() => setStateProperty({showConnectionEditor: false})} 
                api={api}
                onCreate={() => setStateProperty({showConnectionEditor: false})}
              />
              <h1 className='font-medium'>Files</h1>
              <FilesExplorer 
                worksheets={state.worksheets} 
                files={state.notebooks}  
                onOpen={onOpenFile}
              />
            </div>
        </div>
      </>
    )
  }