import { useState, useEffect, Fragment } from 'react'
import uniqid from 'uniqid'
import { CodeEditor } from '../components/Code'
import Table from '../components/Table'

import {
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  LinkIcon,
  MapPinIcon,
  PencilIcon,
} from '@heroicons/react/20/solid'
import { Menu, Transition } from '@headlessui/react'
function execSql(api, query, datasource, onSuccess, onError) {
  console.log(query, datasource, {"query": query, datasource_id: datasource})
  api.post('/query', {"query": query, datasource_id: datasource}, {
    json: (j) => {
    console.log(j)
    onSuccess(j)

    },
    error: err => {
      console.log(err)
      onError && onError(err)
    }
  })
}


function QueryEditorKeyHandler(tabs, ctrlEnterHandler) {
  return (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      const cursorPosition = event.target.selectionStart;
      const textBeforeCursor = event.target.value.substring(0, cursorPosition);
      const textAfterCursor = event.target.value.substring(cursorPosition);

      const blockStart = textBeforeCursor.lastIndexOf(';') + 1;
      const blockEnd = textAfterCursor.indexOf(';');

      const blockText = blockEnd !== -1
        ? event.target.value.substring(blockStart, cursorPosition + blockEnd)
        : event.target.value.substring(blockStart);
      console.log(blockText)
      ctrlEnterHandler(blockText)
    }
  
    if (event.key === 'Tab') {
      event.preventDefault();
      // Insert a tab at the cursor position...
      const cursorPosition = event.target.selectionStart
      event.target.value = event.target.value.substring(0, cursorPosition) + tabs + event.target.value.substring(event.target.selectionEnd)
      event.target.selectionStart = cursorPosition + tabs.length
      event.target.selectionEnd = cursorPosition + tabs.length
    }
  }
}


function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function NotebookHeader({addCell, onPublish}) {
  return (
    <div className="lg:flex lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Notebook
        </h2>
        <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <BriefcaseIcon className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
            Full-time
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <MapPinIcon className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
            Remote
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <CurrencyDollarIcon className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
            $120k &ndash; $140k
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <CalendarIcon className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
            Closing on January 9, 2020
          </div>
        </div>
      </div>
      <div className="mt-5 flex lg:ml-4 lg:mt-0">
        <span className="hidden sm:block">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <PencilIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
            Edit
          </button>
        </span>

        <span className="ml-3 hidden sm:block">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            onClick={addCell}
          >
            <LinkIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
            Cell
          </button>
        </span>

        <span className="sm:ml-3">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={onPublish}
          >
            <CheckIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Publish
          </button>
        </span>

        {/* Dropdown */}
        <Menu as="div" className="relative ml-3 sm:hidden">
          <Menu.Button className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:ring-gray-400">
            More
            <ChevronDownIcon className="-mr-1 ml-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-10 -mr-1 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(active ? 'bg-gray-100' : '', 'block px-4 py-2 text-sm text-gray-700')}
                  >
                    Edit
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(active ? 'bg-gray-100' : '', 'block px-4 py-2 text-sm text-gray-700')}
                  >
                    View
                  </a>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </div>
  )
}


function NotebookToolbar({data, newCell, saveNotebook, metadata, setData}) {
  return (
    <div className='notebook-toolbar-container'>
      <input 
        type='text' 
        value={data.name} 
        onChange={e => setData(prev => Object.assign({}, prev, {name: e.target.value}))} 
        className='notebook-name' />
      <span className='notebook-toolbar-element'>{metadata.datasource}</span>
      <button onClick={newCell}>Add cell</button>
      <Button onClick={saveNotebook}>Save</Button>
    </div>
  )
}
//TODO rename styleselector
function DashboardTypeSelector({cell, choices, setStyle}) {
  console.log(cell)
  return (
    <div className='selector-container'>
      {choices.map(choice => <Button onClick={() => setStyle({type: choice})}>{choice}</Button>)}
    </div>
  )
}

function DashboardSettings({cell, setStyle}) {
  return (
    <div className='selector-container'>
      <span>X</span>
      <Dropdown 
        items={(cell && cell.result && cell.result.columns) || []} 
        text={(cell && cell.style && cell.style.x && cell.style.x.name) || 'X axis'}
        onSelect={(column, k) => setStyle(prev => Object.assign({}, prev, {x: {name: column, idx: k}}))}  
      />
      <span>Y</span>
      <Dropdown 
        items={(cell && cell.result && cell.result.columns) || []} 
        text={(cell && cell.style && cell.style.y && cell.style.y.name) || 'Y axis'}
        onSelect={(column, k) => setStyle(prev => Object.assign({}, prev, {y: {name: column, idx: k}}))}  
      />
    </div>
  )
}

function NotebookCellToolbar({cell, run, isComputing, setStyle}) {
  return (
    <div className='notebook-cell-status-bar'>
      <div className='notebook-cell-status-bar-left'>
        <Button icon='fa-play' onClick={run} isLoading={isComputing}>
          Run
        </Button>
        <span className='notebook-cell-duration'>
          {cell.result && Math.round(cell.result.duration)} s
        </span>
        <DashboardTypeSelector 
          cell={cell}
          choices={['Table', 'Dashboard']}
          setStyle={setStyle}
        />
      </div>
      {(cell && cell.style && cell.result) && <DashboardSettings 
        cell={cell}
        setStyle={setStyle}
      />}
    </div>
  )
}

function NotebookCell({api, datasource, setQuery, setResult, setStyle, cell, onCtrlEnter}) {
  const [state, setState] = useState({isComputing: false}) 
  console.log('NotebookCell', cell, state, datasource)
  const onQueryResult = res => {
    console.log("RECEIVED result", res)
    setResult(res)
    setState({isComputing: false})
  }
  return (
    <div>
      <CodeEditor 
        code={cell.query} 
        setCode={setQuery}
        onCtrlEnter={() => {
          console.log(cell.query)
          execSql(api, cell.query, datasource, onQueryResult, onQueryResult)
          setState({isComputing: true})
        }}
      />
      {false && <NotebookCellToolbar 
        run={() => {
          execSql(api, cell.query, datasource, onQueryResult, onQueryResult)
          setState({isComputing: true})
        }}
        isComputing={state.isComputing}
        cell={cell}
        setStyle={style => {
          console.log(style)
          setStyle(style)
        }}
      />}
      {cell.result.columns && ((cell.style && cell.style.type === 'Table' )|| true) && <Table 
        columns={cell.result.columns} 
        rows={cell.result.rows}
      />}
      {cell.result.error && <span>{JSON.stringify(cell?.result?.error)}</span>}
    </div>
  )
}
/*

        
*/ 

export function Notebook({api, datasource, show, data}) {
  const [state, setState] = useState({cells: {}})
  const updateCell = (cell, property) => value => {
    console.log(typeof value)
    const f = (typeof value !== 'function') ? () => value : value
    console.log(property, f)
    setState(
      prev => {
        const res = Object.assign(
          {}, 
          prev, 
          Object.assign({}, prev.cells, {[cell.id]: Object.assign(prev.cells[cell.id], {}, {[property]: f(prev.cells[cell.id][property])})})
        )
        return res
      }
    )
  }
  const addCell = () => {
    const newCellID = uniqid()
    console.log(newCellID)
    setState(prev => Object.assign({}, prev, {cells: Object.assign({}, prev.cells, {[newCellID]: {
      "query": "", "result": {}, "position": 1, "id": newCellID
    }})}))
  }
  useEffect(() => {
    console.log('datasource', datasource)
      setState(Object.assign({}, data, {datasource_id: datasource?.datasource_id, cells: Object.fromEntries((data?.cells || []).map(cell => [cell.id, cell]))}))
  }, [data, datasource])
  console.log('state@Notebook', state)
  if(!show) return <span />
  return (
    <div>
      <NotebookHeader 
        addCell={addCell}
        onPublish={() => {
          api.userdata.notebooks.write(Object.assign({}, state, {cells: Object.values(state.cells)}))
        }}
      />
      {false && <NotebookToolbar 
        newCell={addCell}
        metadata={{datasource: datasource}}
        data={state}
        setData={setState}
        saveNotebook={() => {
          api.userdata.notebooks.write(Object.assign({}, state, {cells: Object.values(state.cells)}))
        }}
      />}
      <div className=''>
        {Object.values(state.cells).map((cell, idx) => <NotebookCell 
          api={api}
          datasource={state.datasource_id}
          cell={cell}
          setCell={() => {}}
          setQuery={updateCell(cell, 'query')}
          setResult={updateCell(cell, 'result')}
          setStyle={updateCell(cell, 'style')}
          onCtrlEnter={idx >= state.cells.length - 1 ? addCell : () => {}}
        />)}
      </div>
    </div>
  )
}
