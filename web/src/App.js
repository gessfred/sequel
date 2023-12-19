import { useState, useEffect } from 'react'
import './App.css'
import uniqid from 'uniqid'
import { Button } from './components/foundation/Buttons'
import { Notebook } from './components/Notebook'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faChevronLeft, faPlay } from '@fortawesome/free-solid-svg-icons'
import { CodeEditor } from './components/foundation/Code'
import { Table } from './components/sql/Table'
import { Worksheet } from './components/sql/Worksheet'

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
        callbacks.error({error: err})
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

function DatasourceCard({name, open, createWs, createNb}) {
  return (
    <Card>
      <span className='card-title'>{name}</span>
      <Button onClick={createNb}>
        Create notebook
      </Button>
      <Button onClick={createWs}>
        Worksheet
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
        {state.datasources.map(ds => <DatasourceCard 
          name={ds.name} 
          createNb={() => open({pageid: 'notebook', notebook: {name: 'Untitled', datasource_id: ds.datasource_id, datasource_name: ds.name, cells: []}})}
          createWs={() => open({pageid: 'worksheet', worksheet: {name: 'Untitled', datasource_id: ds.datasource_id}})}
        />)}
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

function App2() {
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
          open={(nb) => setStateProperty(nb)} 
          createDataSource={() => setStateProperty({pageid: 'datasource-creator'})}
        />
        <Notebook 
          api={api} 
          datasource={"postgresql"} 
          show={state.pageid === 'notebook'} 
          data={state.notebook} />
        <DatasourceEditor 
          show={state.pageid === 'datasource-creator'} 
          create={() => setStateProperty({pageid: 'notebook'})} 
          api={api}
        />
        <Worksheet
          api={api}
          datasource={"postgresql"}
          show={state.pageid === 'worksheet'}
          data={state.worksheet}
        />
      </div>
    </div>
  )
}

function App() {
  return (
    <div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-sm">
        <img class="mx-auto h-10 w-auto" src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600" alt="Your Company" />
        <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">Sign in to your account</h2>
      </div>

      <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form class="space-y-6" action="#" method="POST">
          <div>
            <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Email address</label>
            <div class="mt-2">
              <input id="email" name="email" type="email" autocomplete="email" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <label for="password" class="block text-sm font-medium leading-6 text-gray-900">Password</label>
              <div class="text-sm">
                <a href="#" class="font-semibold text-indigo-600 hover:text-indigo-500">Forgot password?</a>
              </div>
            </div>
            <div class="mt-2">
              <input id="password" name="password" type="password" autocomplete="current-password" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
            </div>
          </div>

          <div>
            <button type="submit" class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Sign in</button>
          </div>
        </form>

        <p class="mt-10 text-center text-sm text-gray-500">
          Not a member?
          <a href="#" class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">Start a 14 day free trial</a>
        </p>
      </div>
    </div>
  )
}

export default App
