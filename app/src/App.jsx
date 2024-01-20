import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Home from './pages/Home'
import Worksheet from './pages/Worksheet'
import { Notebook } from './pages/Notebook'
import Layout from './components/Layout'

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
        write: (datasource, hook) => post("/datasources", Object.assign({}, datasource, {owner: user.user_email}), hook)
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

/*function Login({show, onLogin, api}) {
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
}*/



function Signin({api, show, onLogin}) {
  const [state, setState] = useState({user_email: '', otp: '', stage: 'init'})
  console.log(state)
  if(!show) return <span></span>
  if(state.stage === 'init')
  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <img
            className="mx-auto h-10 w-auto"
            src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
            alt="Your Company"
          />
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required

                  value={state.user_email}
                  onChange={(e) => setState(p => Object.assign({}, p, {user_email: e.target.value}))}

                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div>
              <button
                onClick={() => {
                  api.auth.sendOTP(state.user_email, () => console.log('ok'))
                  setState(prev => Object.assign({}, prev, {stage: 'challenge'}))
                }}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Get OTP
              </button>
            </div>


        </div>
      </div>
  )
  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <img
            className="mx-auto h-10 w-auto"
            src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
            alt="Your Company"
          />
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                OTP
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required

                  value={state.otp}
                  onChange={e => setState(prev => Object.assign({}, prev, {otp: e.target.value}))}

                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div>
              <button
                onClick={() => api.auth.getToken(state.user_email, state.otp, onLogin, console.warn)}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign in
              </button>
            </div>


        </div>
      </div>
  )
}


function App() {
  const [count, setCount] = useState(0)
  const [state, setState] = useState({pageid: 'login'})
  const api = API('https://sequel.gessfred.xyz/api', state.user)
  const setStateProperty = property => setState(prev => Object.assign({}, prev, property))
  useEffect(() => {
    const cachedUser = localStorage.getItem("user")
    if(cachedUser) {
      setStateProperty({user: JSON.parse(cachedUser), pageid: 'main'})
    }
  }, [])
  console.log('state')
  return (
    <>
      <Signin 
        show={state.pageid === 'login'} 
        api={api}
        onLogin={user => {
          localStorage.setItem('user', JSON.stringify(user))
          setState({user: user, pageid: 'main'})
        }}
      />
      <Layout
        setMainPage={(page) => setStateProperty({pageid: page})}
      >
        <Home 
          show={state.pageid === 'main'} 
          api={api}
          createNotebook={(ds) => setStateProperty({pageid: 'notebook', datasource: ds})}
          onOpenFile={(file) => {
            console.log('open',file)
            setState(prev => Object.assign({}, prev, file, {pageid: Object.keys(file)[0]}))
          }}
        />
        <Worksheet 
          show={state.pageid === 'worksheet'}
          api={api}
          datasource={state.datasource}
        />
        <Notebook 
            api={api} 
            datasource={state.datasource} 
            show={state.pageid === 'notebook'} 
            data={state.notebook} />
      </Layout>
    </>
  )
}

export default App
