import { useState, useEffect } from 'react'
import logo from './logo.svg';
import './App.css';
import uniqid from 'uniqid'

// url = "https://sequel.gessfred.xyz"

function API(url) {
  const call = (verb, route, callbacks, body) => {
    const headers = {
      method: verb
    }
    if(body) {
      headers['body'] = JSON.stringify(body)
    }
    let response = fetch(url+route, headers)
    if(callbacks.json !== undefined) {
      response = response.then(r => r.json()).then(callbacks.json).catch(err => {})
    }
    return response
  }
  return {
    get: (route, callbacks) => call('GET', route, callbacks),
    post: (route, body, callbacks) => call('POST', route, callbacks, body)
  }
}

function Table({data}) {
  if(!(data && data.columns && data.rows)) return ''
  return (
    <table className='query-results-table'>
      <tr>
        {data.columns.map((column, index) => (
          <th key={index}>{column}</th>
        ))}
      </tr>
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

function execSql(api, query, onSuccess) {
  console.log(query)
  api.post('/query', {"query": query}, {json: (j) => {
    console.log(j)
    onSuccess(j)

  }})
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

function QueryEditor({api, query, setQuery, result, setResult, onCtrlEnter}) {
  const onKeyDown = QueryEditorKeyHandler("  ", (q) => {
    execSql(api, q, setResult)
    onCtrlEnter()
  })
  return (
    <div>
      <textarea
        className='query-editor-input'
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        rows={4}
        cols={50}
      />
      <div className='query-editor-status-bar'>
        <button onClick={() => execSql(api, query, setResult)}>
          Run
        </button>
      </div>
      <Table 
        data={result}
      />
    </div>
  )
}

function NotebookToolbar({newCell, metadata}) {
  return (
    <div className='notebook-toolbar-container'>
      <span className='notebook-toolbar-element'>{metadata.datasource}</span>
      <button onClick={newCell}>Add cell</button>
    </div>
  )
}

function Notebook({api, datasource, show}) {
  const [cells, setCells] = useState({"@root": {"id": "@root", "query": "", "result": {}, "position": 0}})
  const updateCell = (cell, property) => value => {
    setCells(prev => Object.assign({}, prev, {
      [cell.id]: Object.assign({}, cell, {[property]: value})
    }))
  }
  const addCell = () => {
    const newCellID = uniqid()
    setCells(prev => Object.assign({}, prev, {[newCellID]: {
      "query": "", "result": {}, "position": 1, "id": newCellID
    }}))
  }
  if(!show) return <span />
  return (
    <div>
      <NotebookToolbar 
        newCell={addCell}
        metadata={{datasource: datasource}}
      />
      {Object.values(cells).map((cell, idx) => <QueryEditor 
        api={api}
        query={cell.query}
        result={cell.result}
        setQuery={updateCell(cell, 'query')}
        setResult={updateCell(cell, 'result')}
        onCtrlEnter={idx >= cells.length - 1 ? addCell : () => {}}
      />)}
    </div>
  )
}

function DatasourceCard({name, open}) {
  return (
    <div>
      {name}
      <button onClick={open}>Open</button>
    </div>
  )
}

function MainMenu({show, open, createDataSource}) {
  if(!show) return <span />
  return (
    <div>
      <DatasourceCard
        open={open}
        name='postresql'
      />
      <button onClick={createDataSource}>Create</button>
    </div>
  )
}

function LabelInput({label, onChange}) {
  return (
    <div>
      <label>{label}</label>
      <input type='text' />
    </div>
  )
}

function DatasourceEditor({show, create}) {
  if(!show) return <span></span>
  return (
    <div>
      <LabelInput label="Name" />
      <LabelInput label="Connection String" />
      <LabelInput label="Engine" />
      <button>Test</button>
      <button onClick={create}>Create</button>
    </div>
  )
}

function Header({navToMainMenu}) {
  return (
    <div>
      {navToMainMenu && <button onClick={navToMainMenu}>Return</button>}
      <span>Sequel</span>
    </div>
  )
}


function App() {
  const [page, setPage] = useState({id: 'main'})
  const api = API("http://localhost:8080")
  return (
    <div className='App'>
      <Header navToMainMenu={page === 'main' ? null : () => setPage('main')} />
      <MainMenu 
        show={page === 'main'} open={() => setPage('notebook')} 
        createDataSource={() => setPage('datasource-creator')}
      />
      <Notebook api={api} datasource={"postgresqsl"} show={page === 'notebook'} />
      <DatasourceEditor show={page === 'datasource-creator'} create={() => setPage('notebook')} />
    </div>
  );
}

export default App;
