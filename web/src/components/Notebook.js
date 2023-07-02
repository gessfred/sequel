import { useState, useEffect } from 'react'
import uniqid from 'uniqid'
import { Table } from './sql/Table'
import { Button } from './foundation/Buttons'
import { CodeEditor } from './foundation/Code'

function execSql(api, query, datasource, onSuccess, onError) {
  console.log(query, datasource)
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

function NotebookCell({api, query, datasource, setQuery, result, setResult, onCtrlEnter}) {
  const onKeyDown = QueryEditorKeyHandler("  ", (q) => {
    execSql(api, query, datasource, setResult, setResult)
    onCtrlEnter()
  })
  console.log(datasource)
  return (
    <div>
      <CodeEditor 
        code={query} 
        setCode={setQuery}
      />
      <div className='query-editor-status-bar'>
        <button onClick={() => execSql(api, query, datasource, setResult, setResult)}>
          Run
        </button>
      </div>
      {result.columns && <Table 
        data={result}
      />}
      {result.error && <span>{result && result.error}</span>}
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

export function Notebook({api, datasource, show, data}) {
  const [state, setState] = useState({cells: {}})
  const updateCell = (cell, property) => value => {
    setState(prev => Object.assign({}, prev, Object.assign(prev.cells, {}, {[cell.id]: Object.assign({}, cell, {[property]: value})})))
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
          query={cell.query}
          result={cell.result}
          setQuery={updateCell(cell, 'query')}
          setResult={updateCell(cell, 'result')}
          onCtrlEnter={idx >= state.cells.length - 1 ? addCell : () => {}}
        />)}
      </div>
    </div>
  )
}
