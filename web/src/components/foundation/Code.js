export function CodeEditor({code, onChange}) {
  return (
    <div contentEditable={true} onInput={(e) => console.log(e.target.value)}>
      {code}
    </div>
  )
}