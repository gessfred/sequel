import { useState, useEffect } from 'react'
import './App.css'
import uniqid from 'uniqid'
import { Button } from './components/foundation/Buttons'
import { Notebook } from './components/Notebook'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faChevronLeft, faPlay } from '@fortawesome/free-solid-svg-icons'

library.add(faChevronLeft, faPlay)
// url = "https://sequel.gessfred.xyz"

function API(url, user) {
  const call = (verb, route, callbacks, body) => {
    const headers = {
      method: verb
    }
    if(body) {
      headers['body'] = JSON.stringify(body)
    }
    let response = fetch(url+route, headers)
    if(callbacks && callbacks.success !== undefined) {
      response = response.then(r => r.ok && callbacks.success())
    }
    else if(callbacks && callbacks.json !== undefined) {
      response = response
        .then(r => (r.ok && r.json()) || (Promise.reject(r.text())))
        .then(callbacks.json)
    }
    if(callbacks && callbacks.error !== undefined) {
      response = response.catch(err => {
        console.log(err)
        err.then(e => callbacks.error({error: e}))
      })
    }
    return response
  }
  //const callv2 = (verb, route, return_type, body) => {}
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
        post('/login', {otp: otp, user_email: user_email}, {
          json: (token) => onSuccess(token),
          error: (err) => onError(err)
        })
      },
      authenticated: user !== undefined 
    },
    userdata: {
      datasources: {
        read: (callback) => {
          console.log(user)
          get("/datasources?owner="+user.user_email, {
            json: callback
          })
        },
        write: (datasource) => post("/datasources", Object.assign({}, datasource, {owner: user.user_email}))
      },
      notebooks: {
        read: (callback) => {
          get("/notebooks?owner="+user.user_email, {
            json: callback
          })
        },
        write: (nb) => post("/notebooks", Object.assign({}, nb, {owner: user.user_email}))
      }
    },
    sql: {}
  }
}



function Card({children}) {
  return (
    <div className='card'>
      {children}
    </div>
  )
}

function DatasourceCard({name, open}) {
  return (
    <Card>
      <span className='card-title'>{name}</span>
      <Button onClick={open}>
        Create notebook
      </Button>
    </Card>
  )
}

function NotebookCard({notebook, open}) {
  return (
    <Card>
      <span className='card-title'>{notebook.name}</span>
      <Button onClick={open}>Open</Button>
    </Card>
  )
}

function MainMenu({show, open, createDataSource, api}) {
  console.log(api.auth.authenticated)
  const [state, setState] = useState({notebooks: [], datasources: []})
  useEffect(() => {
    if(api.auth.authenticated) {
      api.userdata.datasources.read(datasources => setState(prev => Object.assign({}, prev, {datasources: datasources || []})))
      api.userdata.notebooks.read(nbs => setState(prev => Object.assign({}, prev, {notebooks: nbs || []})))
    }
  }, [api.auth.authenticated])
  if(!show) return <span />
  return (
    <div className='main-container'>
      <h2>Datasources</h2>
      <div className='main-content-container'>
        {state.datasources.map(ds => <DatasourceCard name={ds.name} open={() => open({name: 'Untitled', datasource_id: ds.datasource_id, datasource_name: ds.name, cells: []})} />)}
      </div>
      <button onClick={createDataSource}>Create</button>
      <h2>Notebooks</h2>
      <div className='main-content-container'>
        {state.notebooks.map(nb => <NotebookCard notebook={nb} open={() => open(nb)} />)}
      </div>
    </div>
  )
}

function LabelInput({label, onChange, value}) {
  return (
    <div className='label-input-container'>
      <label>{label}</label>
      <input 
        className='foundation-label-input-label'
        type='text'
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

function DatasourceEditor({show, create, api}) {
  const [state, setState] = useState({datasource: {name: '', connection_string: '', engine: ''}})
  const updateDs = property => value => setState(prev => {
    return Object.assign({}, prev, {datasource: Object.assign({}, prev.datasource, {[property]: value})})
  })
  if(!show) return <span></span>
  return (
    <CenterCard>
      <LabelInput label="Name" value={state.datasource.name} onChange={updateDs('name')} />
      <LabelInput label="Connection String" value={state.datasource.connection_string} onChange={updateDs('connection_string')} />
      <LabelInput label="Engine" value={state.datasource.engine} onChange={updateDs('engine')} />
      <Button>Test</Button>
      <Button onClick={() => {
        api.userdata.datasources.write(Object.assign({}, state.datasource, {datasource_id: uniqid()}))
        create()
      }}>Create</Button>
    </CenterCard>
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
  const [state, setState] = useState({user_email: '', otp: '', stage: 'init'})
  console.log(state)
  if(!show) return <span></span>
  if(state.stage === 'init')
    return (
      <CenterCard >
        <LabelInput 
          label="Email"
          value={state.user_email}
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
        value={state.otp}
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
  const api = API(process.env.REACT_APP_API_URL, state.user)
  const setStateProperty = property => setState(prev => Object.assign({}, prev, property))
  useEffect(() => {
    const cachedUser = localStorage.getItem("user")
    if(cachedUser) {
      setStateProperty({user: JSON.parse(cachedUser), pageid: 'main'})
    }
  }, [])
  return (
    <div className='App'>
      <Header navToMainMenu={state.pageid === 'main' ? null : () => setStateProperty({pageid: 'main'})} />
      <div className='app-main-content'>
        <Login 
          show={state.pageid === 'login'} 
          api={api}
          onLogin={user => {
            localStorage.setItem('user', JSON.stringify(user))
            setState({user: user, pageid: 'main'})
          }}
        />
        <MainMenu 
          api={api}
          show={state.pageid === 'main'} 
          open={(nb) => setStateProperty({pageid: 'notebook', notebook: nb})} 
          createDataSource={() => setStateProperty({pageid: 'datasource-creator'})}
        />
        <Notebook api={api} datasource={"postgresqsl"} show={state.pageid === 'notebook'} data={state.notebook} />
        <DatasourceEditor 
          show={state.pageid === 'datasource-creator'} 
          create={() => setStateProperty({pageid: 'notebook'})} 
          api={api}
        />
      </div>
    </div>
  )
}

export default App
