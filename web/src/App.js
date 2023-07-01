import { useState, useEffect } from 'react'
import logo from './logo.svg';
import './App.css';
import uniqid from 'uniqid'
import { Button, PictoButton } from './components/foundation/Buttons'
import { Table } from './components/sql/Table'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCheckSquare, faChevronLeft, faCoffee } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

library.add(faChevronLeft)
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
    if(callbacks.success != undefined) {
      response = response.then(r => r.ok && callbacks.success())
    }
    else if(callbacks.json !== undefined) {
      response = response
        .then(r => (r.ok && r.json()) || (Promise.reject(r.text())))
        .then(callbacks.json)
    }
    if(callbacks.error !== undefined) {
      response = response.catch(err => {
        console.log(err)
        err.then(e => callbacks.error({error: e}))
      })
    }
    return response
  }
  const get = (route, callbacks) => call('GET', route, callbacks)
  const post = (route, body, callbacks) => call('POST', route, callbacks, body)
  return {
    get: get,
    post: post,
    auth: {
      sendOTP: (user_email, onSuccess) => {
        console.log('/login/otp?user_email='+user_email)
        get('/login/otp?user_email='+user_email, {success: onSuccess})
      },
      getToken: (user_email, otp, onSuccess, onError) => {
        console.log(user_email, otp)
        post('/login', {otp: otp, user_email: user_email}, {
          json: (token) => onSuccess(token),
          error: (err) => onError(err)
        })
      }
    },
    sql: {}
  }
}



function execSql(api, query, onSuccess, onError) {
  console.log(query)
  api.post('/query', {"query": query}, {
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

function QueryEditor({api, query, setQuery, result, setResult, onCtrlEnter}) {
  const onKeyDown = QueryEditorKeyHandler("  ", (q) => {
    execSql(api, query, setResult, setResult)
    onCtrlEnter()
  })
  console.log(result && result.error)
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
        <button onClick={() => execSql(api, query, setResult, setResult)}>
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
      <Button onClick={open}>Open</Button>
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
      <input type='text'
        onChange={e => onChange(e.target.value)}
      />
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
      <Button>Test</Button>
      <Button onClick={create}>Create</Button>
    </div>
  )
}

function Header({navToMainMenu}) {
  return (
    <div className='app-header'>
      
      <Button 
        onClick={navToMainMenu} 
        style={navToMainMenu ? {} : {visibility: 'hidden'}} 
        icon={faChevronLeft}
      />
      <span className='app-title'>Sequel</span>
    </div>
  )
}

function CenterCard({children}) {
  return (
    <div className='center-card-container'>
      <div className='center-card'>
        {children}
      </div>
    </div>
  )
}

function Login({show, onLogin, api}) {
  const [state, setState] = useState({user_email: '', stage: 'init'})
  if(!show) return <span></span>
  if(state.stage === 'init')
    return (
      <CenterCard >
        <LabelInput 
          label="Email"
          onChange={email => setState(prev => Object.assign({}, prev, {user_email: email}))} 
        />
        <Button onClick={() => {
          api.auth.sendOTP(state.user_email, () => console.log('ok'))
          setState(prev => Object.assign({}, prev, {stage: 'challenge'}))
        }}>
          Get code
        </Button>
      </CenterCard>
    )
  return (
    <CenterCard >
      <LabelInput 
        label="Code"
        onChange={code => setState(prev => Object.assign({}, prev, {otp: code}))}
      />
      <Button onClick={() => api.auth.getToken(state.user_email, state.otp, onLogin, console.warn)}>
        Login
      </Button>
    </CenterCard>
  )
}

function App() {
  const [state, setState] = useState({pageid: 'login'})
  const api = API("http://localhost:8080")
  const setStateProperty = property => setState(prev => Object.assign({}, prev, property))
  return (
    <div className='App'>
      <Header navToMainMenu={state.pageid === 'main' ? null : () => setStateProperty({pageid: 'main'})} />
      <div className='app-main-content'>
        <Login 
          show={state.pageid === 'login'} 
          api={api}
          onLogin={user => setState({user: user, pageid: 'main'})}
        />
        <MainMenu 
          show={state.pageid === 'main'} 
          open={() => setStateProperty({pageid: 'notebook'})} 
          createDataSource={() => setStateProperty({pageid: 'datasource-creator'})}
        />
        <Notebook api={api} datasource={"postgresqsl"} show={state.pageid === 'notebook'} />
        <DatasourceEditor show={state.pageid === 'datasource-creator'} create={() => setStateProperty({pageid: 'notebook'})} />
      </div>
    </div>
  );
}

export default App;
