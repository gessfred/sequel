import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import './Code.css'

export function CodeEditor({code, setCode}) {
  /*return (
    <div contentEditable={true} onInput={(e) => console.log(e.target.value)}>
      {code}
    </div>
  )*/
  return (
    <CodeMirror 
      value={code}
      onChange={(code, view) => setCode(code)}
      height='500px'
      basicSetup={{lineNumbers: false}}
      extensions={[sql()]}
    />
  )
}