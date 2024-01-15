import { useRef, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'

function extractTextBetweenSemicolons(text, caretPos) {
  // Find the position of the semicolon before the caret
  let startPos = text.lastIndexOf(';', caretPos - 1);

  // If there is no semicolon before the caret, start from the beginning
  startPos = startPos === -1 ? 0 : startPos + 1;

  // Find the position of the semicolon after the caret
  let endPos = text.indexOf(';', caretPos);

  // If there is no semicolon after the caret, go to the end of the text
  endPos = endPos === -1 ? text.length : endPos;

  // Extract and return the text between the semicolons
  return text.substring(startPos, endPos);
}

export function CodeEditor({code, setCode, onCtrlEnter}) {
  const handleCmdEnter = (event) => {
    console.log('cut @', window.getSelection())
    const {keyCode, ctrlKey}  = event
    if(ctrlKey && keyCode == 13) {
      console.log(window.getSelection().toString())
      const execode = extractTextBetweenSemicolons(code, window.getSelection().baseOffset)
      console.log("EXEC", execode)
      onCtrlEnter()
    } else {
      console.log(keyCode)
    }
  }
  return (
    <CodeMirror 
      value={code}
      onChange={(code, view) => {
        console.log(code, view)
        setCode(code)
      }}
      height='500px'
      basicSetup={{lineNumbers: false}}
      extensions={[sql()]}
      options={{
        extraKeys: {
          'Ctrl-Enter': (cm) => console.log("ctrl+enter")
        }}}
      onKeyDown={handleCmdEnter}
    
    />
  )
}