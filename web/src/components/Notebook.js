import { useState, useEffect } from 'react'
import uniqid from 'uniqid'
import { Table } from './sql/Table'
import { Button } from './foundation/Buttons'
import { CodeEditor } from './foundation/Code'
import './Notebook.css'
import { Dashboard } from './sql/Dashboard'
import { Dropdown } from './foundation/Dropdown'

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
  console.log(cell, state)
  const onQueryResult = res => {
    setResult(res)
    setState({isComputing: false})
  }
  return (
    <div>
      <CodeEditor 
        code={cell.query} 
        setCode={setQuery}
      />
      <NotebookCellToolbar 
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
      />
      {cell.result.columns && cell.style && cell.style.type === 'Table' && <Table 
        data={cell.result}
      />}
      {cell.result && cell.style && cell.style.type === 'Dashboard' && <Dashboard 
        width={600}
        height={250}
        data={(cell.result && cell.style && cell.style.y && cell.result.rows && cell.result.rows.map(row => row[cell.style.y.idx])) || []}
        labels={(cell.result && cell.style && cell.style.x && cell.result.rows && cell.result.rows.map(row => row[cell.style.x.idx])) || []}
      />}
      {cell.result.error && <span>{cell.result && cell.result.error}</span>}
    </div>
  )
}


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
    if(data && data.cells) {
      console.log(Object.fromEntries(data.cells.map(cell => [cell.id, cell])))
      setState(Object.assign({}, data, {cells: Object.fromEntries(data.cells.map(cell => [cell.id, cell]))}))
    }
      
  }, [data])
  if(!show) return <span />
  return (
    <div>
      <NotebookToolbar 
        newCell={addCell}
        metadata={{datasource: datasource}}
        data={state}
        setData={setState}
        saveNotebook={() => {
          api.userdata.notebooks.write(Object.assign({}, state, {cells: Object.values(state.cells)}))
        }}
      />
      <div className='notebook-cells-container'>
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
