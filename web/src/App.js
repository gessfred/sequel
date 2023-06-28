import { useState, useEffect } from 'react'
import logo from './logo.svg';
import './App.css';

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
    <table>
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
  api.post('/query', {"query": query}, {json: onSuccess})
}

function QueryEditor({api}) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  return (
    <div>
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        rows={4}
        cols={50}
      />
      <button onClick={() => execSql(api, query, setResult)}>
        Run
      </button>
      <Table 
        data={result}
      />
    </div>
  )
}

function App() {
  const api = API("http://localhost:8080")
  api.post('/query', {"query": "select * from keystrokes limit 10"}, {json: console.log})
  return (
    <div>
      <QueryEditor api={api} />
    </div>
  );
}

export default App;
