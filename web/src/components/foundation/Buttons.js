import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './Buttons.css'
import { Loader } from './Loader'

export function Button({icon, onClick, style, children, isLoading}) {
  return (
    <button onClick={onClick} style={style}>
      <div className='button-content'>
        {isLoading && <Loader />}
        {!isLoading && icon && <FontAwesomeIcon icon={icon} />}
        {children}
      </div>
    </button>
  )
}

export function PictoButton({onClick}) {

}